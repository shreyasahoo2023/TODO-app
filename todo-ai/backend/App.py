import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import certifi
from bson.objectid import ObjectId
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime

load_dotenv()

app = Flask(__name__)

# ✅ Allow frontend domain (IMPORTANT for production)
CORS(app, origins=[
    "http://localhost:5173",
    "https://shreya-todo.vercel.app"
])

# 🔗 MongoDB (REMOVE hardcoded fallback in production)
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = client["todo_db"]

tasks_collection = db["tasks"]
users_collection = db["users"]

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET", "fallback-secret")

# ---------------- ROOT ----------------
@app.route("/")
def home():
    return "Backend Running 🚀"

# ---------------- GOOGLE AUTH ----------------
@app.route('/auth/google', methods=['POST'])
def auth_google():
    data = request.json
    token = data.get("token")

    if not token:
        return jsonify({"error": "No token"}), 400

    try:
        response = google_requests.Request()
        idinfo = id_token.verify_oauth2_token(token, response, GOOGLE_CLIENT_ID)

        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        users_collection.update_one(
            {"email": email},
            {"$set": {"email": email, "name": name, "picture": picture}},
            upsert=True
        )

        return jsonify({
            "user": {
                "email": email,
                "name": name,
                "picture": picture
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 401

# ---------------- LOGIN ----------------
@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({"email": email})

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode({
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, JWT_SECRET, algorithm="HS256")

    return jsonify({"user": {"email": email}, "token": token})

# ---------------- REGISTER ----------------
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get("email")
    name = data.get("name")
    password = data.get("password")

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User exists"}), 409

    users_collection.insert_one({
        "email": email,
        "name": name,
        "password_hash": generate_password_hash(password)
    })

    return jsonify({"message": "Registered"})

# ---------------- RUN ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # ✅ REQUIRED for Render
    app.run(host="0.0.0.0", port=port)