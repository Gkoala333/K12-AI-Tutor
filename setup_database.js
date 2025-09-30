const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Create database connection
const db = new sqlite3.Database('./k12_tutor.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        setupTables();
    }
});

function setupTables() {
    // Students table
    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            grade_level TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            total_points INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            pet_name TEXT DEFAULT 'Buddy',
            pet_type TEXT DEFAULT 'dragon',
            pet_level INTEGER DEFAULT 1
        )
    `, (err) => {
        if (err) console.error('Error creating students table:', err);
    });

    // Subjects table
    db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            grade_level TEXT NOT NULL,
            description TEXT
        )
    `, (err) => {
        if (err) console.error('Error creating subjects table:', err);
    });

    // Topics table
    db.run(`
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            difficulty_level INTEGER DEFAULT 1,
            FOREIGN KEY (subject_id) REFERENCES subjects (id)
        )
    `, (err) => {
        if (err) console.error('Error creating topics table:', err);
    });

    // Questions table
    db.run(`
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_id INTEGER,
            question_text TEXT NOT NULL,
            question_type TEXT NOT NULL, -- 'multiple_choice', 'short_answer', 'essay'
            options TEXT, -- JSON string for multiple choice options
            correct_answer TEXT NOT NULL,
            explanation TEXT,
            difficulty_level INTEGER DEFAULT 1,
            points INTEGER DEFAULT 10,
            exam_type TEXT, -- 'SAT', 'ACT', 'AP', 'STATE', 'GENERAL'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (topic_id) REFERENCES topics (id)
        )
    `, (err) => {
        if (err) console.error('Error creating questions table:', err);
    });

    // Student attempts table
    db.run(`
        CREATE TABLE IF NOT EXISTS student_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            question_id INTEGER,
            student_answer TEXT,
            is_correct BOOLEAN,
            time_spent INTEGER, -- in seconds
            attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id),
            FOREIGN KEY (question_id) REFERENCES questions (id)
        )
    `, (err) => {
        if (err) console.error('Error creating student_attempts table:', err);
    });

    // Study sessions table
    db.run(`
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            session_type TEXT NOT NULL, -- 'practice', 'exam', 'review'
            subject_id INTEGER,
            topic_id INTEGER,
            questions_answered INTEGER DEFAULT 0,
            correct_answers INTEGER DEFAULT 0,
            points_earned INTEGER DEFAULT 0,
            session_duration INTEGER, -- in seconds
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (student_id) REFERENCES students (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            FOREIGN KEY (topic_id) REFERENCES topics (id)
        )
    `, (err) => {
        if (err) console.error('Error creating study_sessions table:', err);
    });

    // Learning goals table
    db.run(`
        CREATE TABLE IF NOT EXISTS learning_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            goal_type TEXT NOT NULL, -- 'exam_score', 'topic_mastery', 'weekly_practice'
            target_value TEXT NOT NULL,
            current_value TEXT DEFAULT '0',
            target_date DATE,
            is_completed BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id)
        )
    `, (err) => {
        if (err) console.error('Error creating learning_goals table:', err);
    });

    // Pet items table
    db.run(`
        CREATE TABLE IF NOT EXISTS pet_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL, -- 'food', 'toy', 'accessory'
            cost INTEGER NOT NULL,
            description TEXT,
            unlock_level INTEGER DEFAULT 1
        )
    `, (err) => {
        if (err) console.error('Error creating pet_items table:', err);
    });

    // Student pet items table
    db.run(`
        CREATE TABLE IF NOT EXISTS student_pet_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            item_id INTEGER,
            purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id),
            FOREIGN KEY (item_id) REFERENCES pet_items (id)
        )
    `, (err) => {
        if (err) console.error('Error creating student_pet_items table:', err);
        // Insert sample data after all tables are created
        setTimeout(insertSampleData, 1000);
    });
}

function insertSampleData() {
    // Insert subjects
    const subjects = [
        { name: 'Mathematics', grade_level: 'K-12', description: 'Algebra, Geometry, Calculus, Statistics' },
        { name: 'English Language Arts', grade_level: 'K-12', description: 'Reading, Writing, Grammar, Literature' },
        { name: 'Science', grade_level: 'K-12', description: 'Biology, Chemistry, Physics, Earth Science' },
        { name: 'Social Studies', grade_level: 'K-12', description: 'History, Geography, Civics, Economics' }
    ];

    subjects.forEach(subject => {
        db.run(
            'INSERT OR IGNORE INTO subjects (name, grade_level, description) VALUES (?, ?, ?)',
            [subject.name, subject.grade_level, subject.description]
        );
    });

    // Insert sample topics for Mathematics
    const mathTopics = [
        { subject_id: 1, name: 'Algebra Basics', description: 'Variables, equations, and basic operations', difficulty_level: 1 },
        { subject_id: 1, name: 'Linear Equations', description: 'Solving linear equations and graphing', difficulty_level: 2 },
        { subject_id: 1, name: 'Quadratic Functions', description: 'Parabolas, factoring, and quadratic formula', difficulty_level: 3 },
        { subject_id: 1, name: 'Geometry', description: 'Shapes, angles, and spatial reasoning', difficulty_level: 2 },
        { subject_id: 1, name: 'Statistics', description: 'Data analysis, probability, and distributions', difficulty_level: 3 }
    ];

    mathTopics.forEach(topic => {
        db.run(
            'INSERT OR IGNORE INTO topics (subject_id, name, description, difficulty_level) VALUES (?, ?, ?, ?)',
            [topic.subject_id, topic.name, topic.description, topic.difficulty_level]
        );
    });

    // Insert sample questions
    const sampleQuestions = [
        {
            topic_id: 1,
            question_text: "What is the value of x in the equation 2x + 5 = 13?",
            question_type: "multiple_choice",
            options: JSON.stringify(["x = 3", "x = 4", "x = 5", "x = 6"]),
            correct_answer: "x = 4",
            explanation: "To solve 2x + 5 = 13, subtract 5 from both sides: 2x = 8, then divide by 2: x = 4",
            difficulty_level: 1,
            points: 10,
            exam_type: "GENERAL"
        },
        {
            topic_id: 1,
            question_text: "If y = 3x - 2, what is the value of y when x = 5?",
            question_type: "multiple_choice",
            options: JSON.stringify(["y = 11", "y = 13", "y = 15", "y = 17"]),
            correct_answer: "y = 13",
            explanation: "Substitute x = 5 into the equation: y = 3(5) - 2 = 15 - 2 = 13",
            difficulty_level: 1,
            points: 10,
            exam_type: "SAT"
        },
        {
            topic_id: 2,
            question_text: "What is the slope of the line passing through points (2, 3) and (4, 7)?",
            question_type: "multiple_choice",
            options: JSON.stringify(["slope = 1", "slope = 2", "slope = 3", "slope = 4"]),
            correct_answer: "slope = 2",
            explanation: "Slope = (y2 - y1)/(x2 - x1) = (7 - 3)/(4 - 2) = 4/2 = 2",
            difficulty_level: 2,
            points: 15,
            exam_type: "SAT"
        }
    ];

    sampleQuestions.forEach(question => {
        db.run(
            'INSERT OR IGNORE INTO questions (topic_id, question_text, question_type, options, correct_answer, explanation, difficulty_level, points, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [question.topic_id, question.question_text, question.question_type, question.options, question.correct_answer, question.explanation, question.difficulty_level, question.points, question.exam_type]
        );
    });

    // Insert pet items
    const petItems = [
        { name: 'Apple', type: 'food', cost: 5, description: 'A healthy snack for your pet', unlock_level: 1 },
        { name: 'Ball', type: 'toy', cost: 10, description: 'A fun toy to play with', unlock_level: 1 },
        { name: 'Crown', type: 'accessory', cost: 50, description: 'A royal crown for your pet', unlock_level: 3 },
        { name: 'Magic Wand', type: 'toy', cost: 100, description: 'A magical wand for advanced pets', unlock_level: 5 }
    ];

    petItems.forEach(item => {
        db.run(
            'INSERT OR IGNORE INTO pet_items (name, type, cost, description, unlock_level) VALUES (?, ?, ?, ?, ?)',
            [item.name, item.type, item.cost, item.description, item.unlock_level]
        );
    });

    // Create a demo student
    const demoStudentId = uuidv4();
    const hashedPassword = bcrypt.hashSync('demo123', 10);
    
    db.run(
        'INSERT OR IGNORE INTO students (id, username, email, password_hash, grade_level) VALUES (?, ?, ?, ?, ?)',
        [demoStudentId, 'demo_student', 'demo@example.com', hashedPassword, '9th Grade']
    );

    console.log('Database setup completed successfully!');
    console.log('Demo student created:');
    console.log('Username: demo_student');
    console.log('Password: demo123');
    
    db.close();
}

module.exports = { setupTables };
