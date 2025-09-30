const sqlite3 = require('sqlite3').verbose();

// Create database connection
const db = new sqlite3.Database('./k12_tutor.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to K12 Tutor SQLite database for extension');
        extendDatabase();
    }
});

function extendDatabase() {
    console.log('开始扩展数据库结构...');

    // 1. 作业帮助记录表
    db.run(`
        CREATE TABLE IF NOT EXISTS homework_help_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            question_text TEXT NOT NULL,
            question_image BLOB,
            subject VARCHAR(50),
            question_type VARCHAR(50) DEFAULT 'text',
            ai_response JSON,
            steps_guidance JSON,
            related_concepts JSON,
            difficulty_level INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_duration INTEGER,
            student_rating INTEGER,
            FOREIGN KEY (student_id) REFERENCES students (id)
        )
    `, (err) => {
        if (err) console.error('Error creating homework_help_sessions table:', err);
        else console.log('✅ homework_help_sessions table created');
    });

    // 2. 知识图谱表
    db.run(`
        CREATE TABLE IF NOT EXISTS knowledge_graph (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject VARCHAR(50) NOT NULL,
            topic VARCHAR(100) NOT NULL,
            prerequisite_topics JSON,
            related_topics JSON,
            difficulty_level INTEGER DEFAULT 1,
            mastery_threshold FLOAT DEFAULT 0.8,
            description TEXT,
            learning_objectives JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creating knowledge_graph table:', err);
        else console.log('✅ knowledge_graph table created');
    });

    // 3. 学生知识掌握程度表
    db.run(`
        CREATE TABLE IF NOT EXISTS student_knowledge_mastery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            knowledge_node_id INTEGER,
            mastery_level FLOAT DEFAULT 0.0,
            last_practiced DATETIME,
            practice_count INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            confidence_score FLOAT DEFAULT 0.0,
            FOREIGN KEY (student_id) REFERENCES students (id),
            FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_graph (id)
        )
    `, (err) => {
        if (err) console.error('Error creating student_knowledge_mastery table:', err);
        else console.log('✅ student_knowledge_mastery table created');
    });

    // 4. 诊断测试表
    db.run(`
        CREATE TABLE IF NOT EXISTS diagnostic_tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            subject VARCHAR(50),
            test_type VARCHAR(50) DEFAULT 'adaptive',
            questions_answered JSON,
            responses JSON,
            ability_estimate FLOAT,
            confidence_interval JSON,
            recommended_topics JSON,
            test_duration INTEGER,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id)
        )
    `, (err) => {
        if (err) console.error('Error creating diagnostic_tests table:', err);
        else console.log('✅ diagnostic_tests table created');
    });

    // 5. 学习路径表
    db.run(`
        CREATE TABLE IF NOT EXISTS learning_paths (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            subject VARCHAR(50),
            path_name VARCHAR(100),
            target_goals JSON,
            current_position INTEGER DEFAULT 0,
            path_structure JSON,
            estimated_completion_time INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (student_id) REFERENCES students (id)
        )
    `, (err) => {
        if (err) console.error('Error creating learning_paths table:', err);
        else console.log('✅ learning_paths table created');
    });

    // 6. 语言学习会话表
    db.run(`
        CREATE TABLE IF NOT EXISTS language_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            session_type VARCHAR(50) DEFAULT 'conversation',
            conversation_text TEXT,
            audio_data BLOB,
            pronunciation_score FLOAT,
            grammar_corrections JSON,
            vocabulary_usage JSON,
            scenario_type VARCHAR(50),
            difficulty_level INTEGER DEFAULT 1,
            session_duration INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id)
        )
    `, (err) => {
        if (err) console.error('Error creating language_sessions table:', err);
        else console.log('✅ language_sessions table created');
    });

    // 7. AI辅导会话表
    db.run(`
        CREATE TABLE IF NOT EXISTS ai_tutoring_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            session_type VARCHAR(50) DEFAULT 'socratic',
            topic VARCHAR(100),
            conversation_history JSON,
            student_reasoning_path JSON,
            hints_provided JSON,
            learning_insights JSON,
            session_rating INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students (id)
        )
    `, (err) => {
        if (err) console.error('Error creating ai_tutoring_sessions table:', err);
        else console.log('✅ ai_tutoring_sessions table created');
    });

    // 8. 用户使用限制表
    db.run(`
        CREATE TABLE IF NOT EXISTS usage_limits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            feature_type VARCHAR(50),
            daily_usage INTEGER DEFAULT 0,
            monthly_usage INTEGER DEFAULT 0,
            last_reset_date DATE,
            is_premium BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (student_id) REFERENCES students (id)
        )
    `, (err) => {
        if (err) console.error('Error creating usage_limits table:', err);
        else console.log('✅ usage_limits table created');
    });

    // 插入示例知识图谱数据
    setTimeout(insertKnowledgeGraphData, 2000);
}

function insertKnowledgeGraphData() {
    console.log('插入知识图谱示例数据...');

    // 数学知识图谱
    const mathKnowledge = [
        {
            subject: 'Mathematics',
            topic: 'Basic Arithmetic',
            prerequisite_topics: JSON.stringify([]),
            related_topics: JSON.stringify(['Fractions', 'Decimals', 'Algebra Basics']),
            difficulty_level: 1,
            description: 'Basic addition, subtraction, multiplication, and division',
            learning_objectives: JSON.stringify(['Master basic operations', 'Understand number properties'])
        },
        {
            subject: 'Mathematics',
            topic: 'Algebra Basics',
            prerequisite_topics: JSON.stringify(['Basic Arithmetic']),
            related_topics: JSON.stringify(['Linear Equations', 'Quadratic Functions']),
            difficulty_level: 2,
            description: 'Variables, expressions, and basic algebraic operations',
            learning_objectives: JSON.stringify(['Understand variables', 'Solve simple equations'])
        },
        {
            subject: 'Mathematics',
            topic: 'Linear Equations',
            prerequisite_topics: JSON.stringify(['Algebra Basics']),
            related_topics: JSON.stringify(['Quadratic Functions', 'Graphing']),
            difficulty_level: 2,
            description: 'Solving and graphing linear equations',
            learning_objectives: JSON.stringify(['Solve linear equations', 'Graph linear functions'])
        },
        {
            subject: 'Mathematics',
            topic: 'Quadratic Functions',
            prerequisite_topics: JSON.stringify(['Linear Equations', 'Algebra Basics']),
            related_topics: JSON.stringify(['Polynomials', 'Graphing']),
            difficulty_level: 3,
            description: 'Quadratic equations, factoring, and the quadratic formula',
            learning_objectives: JSON.stringify(['Factor quadratics', 'Use quadratic formula', 'Graph parabolas'])
        }
    ];

    mathKnowledge.forEach(knowledge => {
        db.run(
            'INSERT OR IGNORE INTO knowledge_graph (subject, topic, prerequisite_topics, related_topics, difficulty_level, description, learning_objectives) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [knowledge.subject, knowledge.topic, knowledge.prerequisite_topics, knowledge.related_topics, knowledge.difficulty_level, knowledge.description, knowledge.learning_objectives]
        );
    });

    // 科学知识图谱
    const scienceKnowledge = [
        {
            subject: 'Science',
            topic: 'Basic Chemistry',
            prerequisite_topics: JSON.stringify([]),
            related_topics: JSON.stringify(['Periodic Table', 'Chemical Reactions']),
            difficulty_level: 2,
            description: 'Atoms, molecules, and basic chemical concepts',
            learning_objectives: JSON.stringify(['Understand atomic structure', 'Identify elements'])
        },
        {
            subject: 'Science',
            topic: 'Physics Basics',
            prerequisite_topics: JSON.stringify(['Basic Arithmetic']),
            related_topics: JSON.stringify(['Motion', 'Forces', 'Energy']),
            difficulty_level: 2,
            description: 'Basic physics concepts and measurements',
            learning_objectives: JSON.stringify(['Understand motion', 'Calculate forces'])
        }
    ];

    scienceKnowledge.forEach(knowledge => {
        db.run(
            'INSERT OR IGNORE INTO knowledge_graph (subject, topic, prerequisite_topics, related_topics, difficulty_level, description, learning_objectives) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [knowledge.subject, knowledge.topic, knowledge.prerequisite_topics, knowledge.related_topics, knowledge.difficulty_level, knowledge.description, knowledge.learning_objectives]
        );
    });

    // 为演示学生创建使用限制记录
    db.run(
        'INSERT OR IGNORE INTO usage_limits (student_id, feature_type, daily_usage, monthly_usage, last_reset_date, is_premium) VALUES (?, ?, ?, ?, ?, ?)',
        ['c1c311de-363e-46e7-b513-019c74a26192', 'homework_help', 0, 0, new Date().toISOString().split('T')[0], false]
    );

    console.log('✅ 知识图谱数据插入完成');
    console.log('数据库扩展完成！');
    
    db.close();
}

module.exports = { extendDatabase };
