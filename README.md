# **PolyPrint 3D** 
_Automated 3D Print Job Distribution_

## 📌 **Project Overview**  
PolyPrint 3D speeds up the 3D-printing process by **splitting large prints into smaller parts** and **distributing them across multiple printers**. This significantly reduces print time and increases efficiency.

## 🎯 **Key Features**  
✅ Automatically slices 3D models into smaller parts  
✅ Distributes print jobs across multiple 3D printers  
---

## 🛠 **Tech Stack**  
**Backend:** Python (Flask)  
**Frontend:** JavaScript, Three.js  
**Slicing & Printer Control:** Python, OctoPrint  

---

## 🚀 **Getting Started**  

### **🔹 1. Clone the Repository**  
```sh
git clone https://github.com/your-username/PolyPrint3D.git
cd PolyPrint3D
```

### **🔹 2. Run the Setup Script**  
For **Windows**:  
```sh
.\setup.bat
```
For **macOS/Linux**:  
```sh
./setup.sh
```


### **🔹 3. Run the project**  
**Windows:**  
```sh
.\run.bat
```
**macOS/Linux:**  
```sh
./run.sh
```

## 📂 **Project Structure**  
```
PolyPrint3D/
│── backend/        # Flask API & slicing logic
│── frontend/       # Three.js & Web UI
│── setup.sh        # Linux/macOS setup script
│── setup.bat       # Windows setup script
│── .env.template   # Template for environment variables
│── README.md       # Project documentation
│── requirements.txt # Python dependencies
```

---

## 🛠 **Environment Variables (`.env`)**  
Copy `.env.template` and fill in your details:  
```
FLASK_APP=backend.main
FLASK_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=mysql://user:password@localhost/polyprint
DEBUG=True
```

