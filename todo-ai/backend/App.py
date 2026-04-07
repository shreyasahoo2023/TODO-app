import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

# 🔗 Connect MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://Shreya:Shreya%402005%40@cluster0.00ynjvg.mongodb.net/?appName=Cluster0")
client = MongoClient(MONGO_URI)
db = client["todo_db"]
tasks_collection = db["tasks"]
users_collection = db["users"]

# YOUR GOOGLE CLIENT ID GOES HERE IN .ENV
# Example: GOOGLE_CLIENT_ID="..." 
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "dummy_client_id")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secure-fallback-secret-key-123")

# Middleware to verify Google/Local Token natively
def get_user_from_request():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    
    # 1. Try Local PyJWT Decoder first
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return decoded
    except Exception:
        pass # Not a local token, move to Google parsing

    # 2. Try Google Authentication
    try:
        if GOOGLE_CLIENT_ID == "dummy_client_id" and "." in token:
            # Blindly decode the JWT payload for local simulation if we have no Client ID yet
            import base64
            import json
            payload = token.split(".")[1]
            padded = payload + "=" * (4 - len(payload) % 4)
            decoded = json.loads(base64.urlsafe_b64decode(padded))
            return decoded
            
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        return idinfo
    except Exception as e:
        print("Token verification failed:", e)
        return None

# 🔐 Authenticate Google User
@app.route('/auth/google', methods=['POST'])
def auth_google():
    data = request.json
    token = data.get("token")
    if not token:
        return jsonify({"error": "No token provided"}), 400
        
    try:
        # Same bypass logic for dummy local testing
        if GOOGLE_CLIENT_ID == "dummy_client_id" and "." in token:
            import base64
            import json
            payload = token.split(".")[1]
            padded = payload + "=" * (4 - len(payload) % 4)
            idinfo = json.loads(base64.urlsafe_b64decode(padded))
        else:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
            
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture')

        # Upsert user in database
        users_collection.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture, "email": email}},
            upsert=True
        )

        return jsonify({"message": "Authenticated", "user": {"email": email, "name": name, "picture": picture}})
    except ValueError:
        return jsonify({"error": "Invalid token"}), 401


# 🔐 Authenticate Local User (Manual Login)
@app.route('/auth/login', methods=['POST'])
def auth_login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({"email": email})
    
    if not user or 'password_hash' not in user:
        return jsonify({"error": "Invalid email or password"}), 401
        
    if not check_password_hash(user['password_hash'], password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Mint local JWT token
    exp = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    token = jwt.encode({
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture", ""),
        "exp": exp
    }, JWT_SECRET, algorithm="HS256")

    return jsonify({
        "message": "Authenticated", 
        "token": token,
        "user": {
            "email": user["email"], 
            "name": user.get("name", ""), 
            "picture": user.get("picture", "")
        }
    })

# 🔐 Register Local User
@app.route('/auth/register', methods=['POST'])
def auth_register():
    data = request.json
    email = data.get("email")
    name = data.get("name")
    password = data.get("password")
    
    if not email or not password or not name:
        return jsonify({"error": "Missing fields"}), 400

    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        return jsonify({"error": "Email already exists"}), 409

    # Hash the password securely!
    p_hash = generate_password_hash(password)
    
    users_collection.insert_one({
        "email": email,
        "name": name,
        "password_hash": p_hash,
        "picture": "https://api.dicebear.com/7.x/notionists/svg?seed=" + name
    })

    return jsonify({"message": "User registered successfully"}), 201
def get_priority(task):
    text = task.lower()
    if "urgent" in text or "asap" in text:
        return "High"
    elif "tomorrow" in text or "soon" in text:
        return "Medium"
    return "Low"

# ➕ Add Task
@app.route('/add', methods=['POST'])
def add_task():
    user = get_user_from_request()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    priority = get_priority(data['title'])

    task = {
        "user_email": user['email'], # Link task strictly to user
        "title": data['title'],
        "priority": priority,
        "completed": False,
        "dueDate": data.get("dueDate", None),
        "order": data.get("order", 0)
    }

    result = tasks_collection.insert_one(task)
    return jsonify({
        "id": str(result.inserted_id),
        "title": task["title"],
        "priority": task["priority"],
        "completed": task["completed"],
        "dueDate": task["dueDate"],
        "order": task["order"]
    })

# 📥 Get Tasks
@app.route('/tasks', methods=['GET'])
def get_tasks():
    user = get_user_from_request()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    tasks = []
    # Filter only tasks for this specific user
    for task in tasks_collection.find({"user_email": user['email']}).sort("order", 1):
        tasks.append({
            "id": str(task["_id"]),
            "title": task["title"],
            "priority": task["priority"],
            "completed": task.get("completed", False),
            "dueDate": task.get("dueDate", None),
            "order": task.get("order", 0)
        })
    return jsonify(tasks)

# ❌ Delete Task
@app.route('/delete/<id>', methods=['DELETE'])
def delete_task(id):
    user = get_user_from_request()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    # Must match _id AND user_email for security
    tasks_collection.delete_one({"_id": ObjectId(id), "user_email": user['email']})
    return jsonify({"message": "Deleted"})

# ✏️ Update Task
@app.route('/update/<id>', methods=['PUT'])
def update_task(id):
    user = get_user_from_request()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    update_fields = {}
    
    if 'title' in data: update_fields['title'] = data['title']
    if 'priority' in data: update_fields['priority'] = data['priority']
    if 'completed' in data: update_fields['completed'] = data['completed']
    if 'dueDate' in data: update_fields['dueDate'] = data['dueDate']
    if 'order' in data: update_fields['order'] = data['order']

    if update_fields:
        tasks_collection.update_one(
            {"_id": ObjectId(id), "user_email": user['email']}, 
            {"$set": update_fields}
        )
        
    return jsonify({"message": "Updated successfully"})

if __name__ == '__main__':
    app.run(debug=True)