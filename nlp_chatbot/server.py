from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
import bcrypt
from datetime import datetime
from nlp_query import smart_tax_flow
import base64

app = FastAPI(title="Tax Allocation Chatbot + Signup API")

# ------------------------------------------------------------
# CORS
# ------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# MONGODB
# ------------------------------------------------------------
client = MongoClient("mongodb://localhost:27017")
db = client["user_db"]
users = db["users"]

# ------------------------------------------------------------
# PASSWORD HASHING
# ------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

# ------------------------------------------------------------
# MODELS
# ------------------------------------------------------------
class Signup(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserMessage(BaseModel):
    message: str

class LoginModel(BaseModel):
    email: EmailStr
    password: str

# ------------------------------------------------------------
# SIGNUP
# ------------------------------------------------------------
@app.post("/signup")
def signup(user: Signup):
    if users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    users.insert_one({
        "username": user.username,
        "email": user.email,
        "password": hash_password(user.password),
        "created_at": datetime.utcnow()
    })

    return {"message": "Signup successful!"}

# ------------------------------------------------------------
# LOGIN
# ------------------------------------------------------------
@app.post("/login")
def login(user: LoginModel):
    existing_user = users.find_one({"email": user.email})
    if not existing_user:
        raise HTTPException(status_code=400, detail="Email not registered")

    if not verify_password(user.password, existing_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    return {"message": "Login successful!"}

# ------------------------------------------------------------
# CHATBOT
# ------------------------------------------------------------
@app.post("/api/chat")
def get_chat_response(user: UserMessage):
    try:
        chart_buf, summary = smart_tax_flow(user.message)

        chart_base64 = (
            base64.b64encode(chart_buf.getvalue()).decode("utf-8")
            if chart_buf else None
        )

        return JSONResponse({
            "summary": summary,
            "chart": chart_base64
        })

    except Exception as e:
        print("❌ Backend Error:", e)
        return JSONResponse({
            "summary": "Error processing request.",
            "chart": None
        })

# ------------------------------------------------------------
# ROOT
# ------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Welcome to the Tax Chatbot + Signup API"}
