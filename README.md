# K12 AI Tutor - Intelligent Learning Assistant

An AI-powered tutoring system designed for K12 students, integrating gamified learning, personalized practice, and exam preparation features.

## 🎯 Core Features

### 1. Error Diagnosis & Explanation
- Students can upload questions or input incorrect answers
- AI guides reflection and thinking process
- Step-by-step explanations with analogies and visual aids
- Tailored for comprehension levels from elementary to high school

### 2. Personalized Practice Generation
- Automatically generates 3–5 similar practice problems based on error type
- Gradually increasing difficulty, including challenge questions
- Instant feedback and encouragement system

### 3. Gamified Learning System
- Earn points, coins, and energy by solving questions
- Learning pet system (level up, buy items)
- Virtual learning world building
- Continuous motivation mechanism

### 4. Emotional AI Interaction
- Patient and humorous learning companion tone
- Positive reinforcement and encouragement
- Casual, friendly language with light humor
- Growth-oriented feedback system

### 5. U.S. K12 Exam Preparation
- SAT / ACT / AP test prep
- Score goal setting and personalized learning paths
- Practice simulations and adaptive testing
- Mistake log and weak point analysis
- Real exam simulation experience

---

## 🚀 Quick Start

### Install dependencies
```bash
npm install
```

### Setup database
```bash
npm run setup-db
```

### Start the server
```bash
npm start
```

### Access the app
Open your browser and visit: [http://localhost:3000](http://localhost:3000)

---

## 👤 Demo Account

- **Username:** demo_student  
- **Password:** demo123

---

## 📚 System Architecture

### Backend Stack
- **Node.js + Express:** Server framework  
- **SQLite:** Database storage  
- **JWT:** User authentication  
- **bcryptjs:** Password encryption  

### Frontend Stack
- **HTML5 + CSS3:** Responsive interface  
- **Tailwind CSS:** Modern styling framework  
- **Vanilla JavaScript:** Core interactivity  
- **Chart.js:** Data visualization  

### Database Schema
- `students`: Student info & points system  
- `subjects/topics`: Subject and topic categorization  
- `questions`: Question bank (multiple types supported)  
- `student_attempts`: Answer records and error tracking  
- `study_sessions`: Session tracking  
- `learning_goals`: Goal management  
- `pet_items`: Pet store system  

---

## 🎮 Main Feature Modules

### 1. User Authentication
- Register / Login functionality  
- Grade selection  
- Profile management  

### 2. Practice System
- Subject selection (Math, English, Science, Social Studies)  
- Topic categorization and difficulty levels  
- Supports multiple question types (MCQ, fill-in-the-blank, short answer)  
- Real-time timer and hints  

### 3. Exam Simulation
- SAT / ACT / AP question types  
- Timed mode  
- Score analysis and feedback  
- Mistake review function  

### 4. Learning Goal Management
- Set goals (scores, mastery, practice volume)  
- Progress tracking  
- Completion visualization  

### 5. Pet System
- Learning pet raising system  
- Purchase pet items using points  
- Pet level-up and evolution  
- Motivation through gamification  

---

## 🧠 AI Tutoring Features

### Intelligent Feedback System
- **Success feedback:** “Excellent! You’ve mastered this concept! 🚀”  
- **Assistance feedback:** “Don’t worry! Let’s analyze where it went wrong 🤔”  
- **Growth feedback:** “This problem shows you’ve improved your algebraic reasoning!”  

### Personalized Learning Path
- Recommended practice based on mistakes  
- Adaptive difficulty adjustment  
- Cross-disciplinary learning suggestions  

### Learning Habit Analysis
- Mistake source analysis  
- Error type identification (formula memory, carelessness, conceptual gap)  
- Targeted practice recommendations  
- Weak topic tagging  

---

## 📊 Learning Data Tracking

- Accuracy statistics  
- Study time analysis  
- Points and level system  
- Progress visualization charts  
- Automatic mistake log generation  

---

## 🎯 Use Cases

- **Daily Homework Help:** Error analysis and practice generation  
- **Exam Preparation:** SAT / ACT / AP practice and review  
- **Concept Reinforcement:** Personalized practice and revision  
- **Study Habit Formation:** Gamified motivation system  
- **Parental Supervision:** Progress and performance tracking  

---

## 🔧 Development Notes

### Project Structure
```
k12-ai-tutor/
├── server.js              # Main server file
├── setup_database.js      # Database initialization
├── package.json           # Project configuration
├── public/
│   ├── index.html         # Main page
│   └── app.js             # Frontend logic
└── k12_tutor.db           # SQLite database
```

### API Endpoints
- `POST /api/auth/register` – User registration  
- `POST /api/auth/login` – User login  
- `GET /api/subjects` – Retrieve subject list  
- `GET /api/topics/:id/questions` – Fetch questions  
- `POST /api/questions/:id/answer` – Submit answer  
- `GET /api/exams/:type/questions` – Retrieve exam questions  
- `POST /api/learning-goals` – Set learning goals  
- `GET /api/pet/items` – Get pet store items  

---

## 🌟 Future Expansion

- More subject support  
- Voice interaction capability  
- Mobile app version  
- Parent dashboard  
- Teacher admin console  
- Enhanced gamification  
- Advanced AI dialogue system  

---

## 📝 License
**MIT License**

> Making learning fun — and AI your best study partner! 🎓✨
