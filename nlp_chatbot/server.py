from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
import bcrypt
from datetime import datetime
from nlp_query import smart_tax_flow, load_data
import base64

app = FastAPI(title="Tax Allocation Chatbot + Signup API")

# FIXED CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# MONGODB CONNECTION
# ------------------------------------------------------------
client = MongoClient("mongodb://localhost:27017")
db = client["user_db"]
users = db["users"]

# ------------------------------------------------------------
# PASSWORD HASHING (USING bcrypt ONLY — NO PASSLIB)
# ------------------------------------------------------------
def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ------------------------------------------------------------
# LOAD CHATBOT DATA
# ------------------------------------------------------------
try:
    allocation_data, tax_data = load_data()
    print("✅ JSON data loaded successfully.")
except Exception as e:
    print("❌ Error loading JSON data:", e)
    allocation_data, tax_data = {}, {}

# ------------------------------------------------------------
# MODELS
# ------------------------------------------------------------
class Signup(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserMessage(BaseModel):
    message: str

# ------------------------------------------------------------
# SIGNUP ROUTE
# ------------------------------------------------------------
@app.post("/signup")
def signup(user: Signup):

    # Check if email exists
    if users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = hash_password(user.password)

    users.insert_one({
        "username": user.username,
        "email": user.email,
        "password": hashed_pw,
        "created_at": datetime.utcnow()
    })

    return {"message": "Signup successful!"}

# ------------------------------------------------------------
# CHATBOT ROUTE
# ------------------------------------------------------------
@app.post("/api/chat")
def get_chat_response(user: UserMessage):
    try:
        chart_buf, summary = smart_tax_flow(user.message, allocation_data, tax_data)

        if chart_buf:
            chart_base64 = base64.b64encode(chart_buf.getvalue()).decode("utf-8")
        else:
            chart_base64 = None

        return JSONResponse({
            "summary": summary,
            "chart": chart_base64
        })

    except Exception as e:
        print("❌ Backend Error:", e)
        return JSONResponse({"summary": "Error processing request.", "chart": None})

# ------------------------------------------------------------
# ROOT ENDPOINT
# ------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Welcome to the Tax Chatbot + Signup API"}


# ------------------------------------------------------------
# LOGIN ROUTE
# ------------------------------------------------------------
class LoginModel(BaseModel):
    email: EmailStr
    password: str

@app.post("/login")
def login(user: LoginModel):
    # Check if user exists
    existing_user = users.find_one({"email": user.email})
    if not existing_user:
        raise HTTPException(status_code=400, detail="Email not registered")

    # Verify password
    hashed_pw = existing_user["password"]
    if not verify_password(user.password, hashed_pw):
        raise HTTPException(status_code=400, detail="Incorrect password")

    return {"message": "Login successful!"}
