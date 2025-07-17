from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
import random
from datetime import datetime
import os
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL')
client = MongoClient(MONGO_URL)
db = client.task_ranking_db
users_collection = db.users
claims_collection = db.claims

# Pydantic models
class User(BaseModel):
    id: str
    name: str
    total_points: int
    created_at: datetime

class UserCreate(BaseModel):
    name: str

class ClaimHistory(BaseModel):
    id: str
    user_id: str
    user_name: str
    points_awarded: int
    timestamp: datetime

class ClaimRequest(BaseModel):
    user_id: str

class UserResponse(BaseModel):
    id: str
    name: str
    total_points: int
    rank: int

class ClaimResponse(BaseModel):
    success: bool
    user_id: str
    user_name: str
    points_awarded: int
    new_total_points: int
    message: str

# Initialize with sample users
def initialize_sample_users():
    sample_users = [
        "Rahul", "Kamal", "Sanak", "Priya", "Amit", 
        "Neha", "Rohit", "Anita", "Vikram", "Pooja"
    ]
    
    for name in sample_users:
        existing_user = users_collection.find_one({"name": name})
        if not existing_user:
            user_data = {
                "id": str(uuid.uuid4()),
                "name": name,
                "total_points": 0,
                "created_at": datetime.utcnow()
            }
            users_collection.insert_one(user_data)

# Initialize sample users on startup
initialize_sample_users()

@app.get("/api/users", response_model=List[UserResponse])
async def get_users():
    """Get all users with their rankings"""
    try:
        # Get all users and sort by total_points descending
        users = list(users_collection.find({}, {"_id": 0}).sort("total_points", -1))
        
        # Add ranking to each user
        ranked_users = []
        for index, user in enumerate(users):
            ranked_users.append(UserResponse(
                id=user["id"],
                name=user["name"],
                total_points=user["total_points"],
                rank=index + 1
            ))
        
        return ranked_users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@app.post("/api/users", response_model=UserResponse)
async def add_user(user: UserCreate):
    """Add a new user"""
    try:
        # Check if user already exists
        existing_user = users_collection.find_one({"name": user.name})
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this name already exists")
        
        # Create new user
        user_data = {
            "id": str(uuid.uuid4()),
            "name": user.name,
            "total_points": 0,
            "created_at": datetime.utcnow()
        }
        
        users_collection.insert_one(user_data)
        
        # Calculate rank (will be last initially)
        total_users = users_collection.count_documents({})
        
        return UserResponse(
            id=user_data["id"],
            name=user_data["name"],
            total_points=user_data["total_points"],
            rank=total_users
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding user: {str(e)}")

@app.post("/api/claim", response_model=ClaimResponse)
async def claim_points(claim_request: ClaimRequest):
    """Claim random points (1-10) for a user"""
    try:
        # Find the user
        user = users_collection.find_one({"id": claim_request.user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate random points (1-10)
        points_awarded = random.randint(1, 10)
        
        # Update user's total points
        new_total_points = user["total_points"] + points_awarded
        users_collection.update_one(
            {"id": claim_request.user_id},
            {"$set": {"total_points": new_total_points}}
        )
        
        # Create claim history entry
        claim_history = {
            "id": str(uuid.uuid4()),
            "user_id": claim_request.user_id,
            "user_name": user["name"],
            "points_awarded": points_awarded,
            "timestamp": datetime.utcnow()
        }
        claims_collection.insert_one(claim_history)
        
        return ClaimResponse(
            success=True,
            user_id=claim_request.user_id,
            user_name=user["name"],
            points_awarded=points_awarded,
            new_total_points=new_total_points,
            message=f"{user['name']} earned {points_awarded} points! New total: {new_total_points}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error claiming points: {str(e)}")

@app.get("/api/history", response_model=List[ClaimHistory])
async def get_claim_history():
    """Get claim history sorted by timestamp (newest first)"""
    try:
        history = list(claims_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(50))
        return [ClaimHistory(**record) for record in history]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Task Ranking System API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)