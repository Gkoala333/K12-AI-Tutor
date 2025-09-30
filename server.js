const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./k12_tutor.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to K12 Tutor SQLite database');
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test route for subjects functionality
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test_subjects.html'));
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, gradeLevel } = req.body;
    
    if (!username || !email || !password || !gradeLevel) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const studentId = uuidv4();
        
        db.run(
            'INSERT INTO students (id, username, email, password_hash, grade_level) VALUES (?, ?, ?, ?, ?)',
            [studentId, username, email, hashedPassword, gradeLevel],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Username or email already exists' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                
                const token = jwt.sign(
                    { id: studentId, username, gradeLevel },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                res.json({ token, student: { id: studentId, username, gradeLevel } });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get(
        'SELECT * FROM students WHERE username = ?',
        [username],
        async (err, student) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (!student) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            try {
                const isValid = await bcrypt.compare(password, student.password_hash);
                if (!isValid) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                
                const token = jwt.sign(
                    { id: student.id, username: student.username, gradeLevel: student.grade_level },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                res.json({ 
                    token, 
                    student: { 
                        id: student.id, 
                        username: student.username, 
                        gradeLevel: student.grade_level,
                        totalPoints: student.total_points,
                        level: student.level,
                        petName: student.pet_name,
                        petType: student.pet_type,
                        petLevel: student.pet_level
                    } 
                });
            } catch (error) {
                res.status(500).json({ error: 'Login failed' });
            }
        }
    );
});

// Student profile routes
app.get('/api/student/profile', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, username, email, grade_level, total_points, level, pet_name, pet_type, pet_level FROM students WHERE id = ?',
        [req.user.id],
        (err, student) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(student);
        }
    );
});

// Subjects and topics routes
app.get('/api/subjects', (req, res) => {
    db.all('SELECT * FROM subjects ORDER BY name', [], (err, subjects) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(subjects);
    });
});

app.get('/api/subjects/:id/topics', (req, res) => {
    const subjectId = req.params.id;
    db.all(
        'SELECT * FROM topics WHERE subject_id = ? ORDER BY difficulty_level, name',
        [subjectId],
        (err, topics) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(topics);
        }
    );
});

// Question routes
app.get('/api/topics/:id/questions', authenticateToken, (req, res) => {
    const topicId = req.params.id;
    const { difficulty, examType, limit = 10 } = req.query;
    
    let query = 'SELECT * FROM questions WHERE topic_id = ?';
    let params = [topicId];
    
    if (difficulty) {
        query += ' AND difficulty_level = ?';
        params.push(difficulty);
    }
    
    if (examType) {
        query += ' AND exam_type = ?';
        params.push(examType);
    }
    
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, questions) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Parse options for multiple choice questions
        const processedQuestions = questions.map(q => {
            if (q.options) {
                q.options = JSON.parse(q.options);
            }
            return q;
        });
        
        res.json(processedQuestions);
    });
});

// Submit answer route
app.post('/api/questions/:id/answer', authenticateToken, (req, res) => {
    const questionId = req.params.id;
    const { studentAnswer, timeSpent } = req.body;
    const studentId = req.user.id;
    
    // Get the question first
    db.get(
        'SELECT * FROM questions WHERE id = ?',
        [questionId],
        (err, question) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (!question) {
                return res.status(404).json({ error: 'Question not found' });
            }
            
            const isCorrect = studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
            const pointsEarned = isCorrect ? question.points : 0;
            
            // Record the attempt
            db.run(
                'INSERT INTO student_attempts (student_id, question_id, student_answer, is_correct, time_spent) VALUES (?, ?, ?, ?, ?)',
                [studentId, questionId, studentAnswer, isCorrect, timeSpent],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    // Update student points if correct
                    if (isCorrect) {
                        db.run(
                            'UPDATE students SET total_points = total_points + ? WHERE id = ?',
                            [pointsEarned, studentId],
                            (err) => {
                                if (err) {
                                    console.error('Error updating points:', err);
                                }
                            }
                        );
                    }
                    
                    // Generate AI feedback
                    const feedback = generateAIFeedback(question, studentAnswer, isCorrect);
                    
                    res.json({
                        isCorrect,
                        pointsEarned,
                        correctAnswer: question.correct_answer,
                        explanation: question.explanation,
                        feedback
                    });
                }
            );
        }
    );
});

// AI Feedback generation
function generateAIFeedback(question, studentAnswer, isCorrect) {
    const encouragingMessages = [
        "太棒了！你完全理解了这个概念！🚀",
        "完美！你的思路很清晰！✨",
        "做得好！继续保持这种学习状态！💪",
        "优秀！你已经掌握了这个知识点！🎯"
    ];
    
    const helpfulMessages = [
        "别灰心！让我们一起来看看哪里需要改进 🤔",
        "没关系，错误是学习的一部分！让我们分析一下 💡",
        "很好的尝试！让我来帮你理解正确的思路 🧠",
        "这个错误很常见，让我们一步步解决它 🔍"
    ];
    
    if (isCorrect) {
        return {
            type: 'success',
            message: encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)],
            suggestion: "继续挑战下一题，你的学习宠物会为你感到骄傲的！"
        };
    } else {
        return {
            type: 'helpful',
            message: helpfulMessages[Math.floor(Math.random() * helpfulMessages.length)],
            suggestion: "仔细阅读解释，然后尝试类似的题目来巩固理解。"
        };
    }
}

// Study session routes
app.post('/api/study-sessions', authenticateToken, (req, res) => {
    const { sessionType, subjectId, topicId } = req.body;
    const studentId = req.user.id;
    
    db.run(
        'INSERT INTO study_sessions (student_id, session_type, subject_id, topic_id) VALUES (?, ?, ?, ?)',
        [studentId, sessionType, subjectId, topicId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ sessionId: this.lastID });
        }
    );
});

app.put('/api/study-sessions/:id', authenticateToken, (req, res) => {
    const sessionId = req.params.id;
    const { questionsAnswered, correctAnswers, pointsEarned, sessionDuration } = req.body;
    
    db.run(
        'UPDATE study_sessions SET questions_answered = ?, correct_answers = ?, points_earned = ?, session_duration = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [questionsAnswered, correctAnswers, pointsEarned, sessionDuration, sessionId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        }
    );
});

// Learning goals routes
app.get('/api/learning-goals', authenticateToken, (req, res) => {
    const studentId = req.user.id;
    
    db.all(
        'SELECT * FROM learning_goals WHERE student_id = ? ORDER BY created_at DESC',
        [studentId],
        (err, goals) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(goals);
        }
    );
});

app.post('/api/learning-goals', authenticateToken, (req, res) => {
    const { goalType, targetValue, targetDate } = req.body;
    const studentId = req.user.id;
    
    db.run(
        'INSERT INTO learning_goals (student_id, goal_type, target_value, target_date) VALUES (?, ?, ?, ?)',
        [studentId, goalType, targetValue, targetDate],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ goalId: this.lastID });
        }
    );
});

// Pet system routes
app.get('/api/pet/items', (req, res) => {
    db.all('SELECT * FROM pet_items ORDER BY unlock_level, cost', [], (err, items) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(items);
    });
});

app.post('/api/pet/purchase', authenticateToken, (req, res) => {
    const { itemId } = req.body;
    const studentId = req.user.id;
    
    // Check if student has enough points and item exists
    db.get(
        'SELECT cost, unlock_level FROM pet_items WHERE id = ?',
        [itemId],
        (err, item) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (!item) {
                return res.status(404).json({ error: 'Item not found' });
            }
            
            db.get(
                'SELECT total_points, level FROM students WHERE id = ?',
                [studentId],
                (err, student) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (student.total_points < item.cost) {
                        return res.status(400).json({ error: 'Not enough points' });
                    }
                    
                    if (student.level < item.unlock_level) {
                        return res.status(400).json({ error: 'Item not unlocked yet' });
                    }
                    
                    // Purchase the item
                    db.run(
                        'INSERT INTO student_pet_items (student_id, item_id) VALUES (?, ?)',
                        [studentId, itemId],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }
                            
                            // Deduct points
                            db.run(
                                'UPDATE students SET total_points = total_points - ? WHERE id = ?',
                                [item.cost, studentId],
                                (err) => {
                                    if (err) {
                                        return res.status(500).json({ error: err.message });
                                    }
                                    res.json({ success: true, pointsRemaining: student.total_points - item.cost });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// Exam simulation routes
app.get('/api/exams/:type/questions', authenticateToken, (req, res) => {
    const examType = req.params.type.toUpperCase();
    const { subject, limit = 20 } = req.query;
    
    let query = 'SELECT * FROM questions WHERE exam_type = ?';
    let params = [examType];
    
    if (subject) {
        query += ' AND topic_id IN (SELECT id FROM topics WHERE subject_id = ?)';
        params.push(subject);
    }
    
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, questions) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const processedQuestions = questions.map(q => {
            if (q.options) {
                q.options = JSON.parse(q.options);
            }
            return q;
        });
        
        res.json(processedQuestions);
    });
});

// Homework Help System Routes
app.post('/api/homework-help', authenticateToken, async (req, res) => {
    const { questionText, subject, questionType = 'text' } = req.body;
    const studentId = req.user.id;
    
    if (!questionText || !subject) {
        return res.status(400).json({ error: 'Question text and subject are required' });
    }
    
    try {
        // Check usage limits
        const usageCheck = await checkUsageLimit(studentId, 'homework_help');
        if (!usageCheck.allowed) {
            return res.status(429).json({ 
                error: 'Daily limit reached', 
                limit: usageCheck.limit,
                used: usageCheck.used,
                resetTime: usageCheck.resetTime
            });
        }
        
        // Generate AI response
        const aiResponse = await generateHomeworkHelp(questionText, subject);
        
        // Record the session
        const sessionStartTime = Date.now();
        db.run(
            'INSERT INTO homework_help_sessions (student_id, question_text, subject, question_type, ai_response, steps_guidance, related_concepts) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                studentId, 
                questionText, 
                subject, 
                questionType,
                JSON.stringify(aiResponse.response),
                JSON.stringify(aiResponse.steps),
                JSON.stringify(aiResponse.relatedConcepts)
            ],
            function(err) {
                if (err) {
                    console.error('Error recording homework help session:', err);
                }
                
                // Update usage count
                updateUsageCount(studentId, 'homework_help');
                
                // Award points for using the feature
                db.run(
                    'UPDATE students SET total_points = total_points + ? WHERE id = ?',
                    [5, studentId],
                    (err) => {
                        if (err) console.error('Error updating points:', err);
                    }
                );
                
                res.json({
                    sessionId: this.lastID,
                    response: aiResponse.response,
                    steps: aiResponse.steps,
                    relatedConcepts: aiResponse.relatedConcepts,
                    pointsEarned: 5,
                    usageRemaining: usageCheck.limit - usageCheck.used - 1
                });
            }
        );
        
    } catch (error) {
        console.error('Homework help error:', error);
        res.status(500).json({ error: 'Failed to process homework help request' });
    }
});

// Get homework help history
app.get('/api/homework-help/history', authenticateToken, (req, res) => {
    const studentId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;
    
    db.all(
        'SELECT id, question_text, subject, created_at, student_rating FROM homework_help_sessions WHERE student_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [studentId, parseInt(limit), parseInt(offset)],
        (err, sessions) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(sessions);
        }
    );
});

// Rate homework help session
app.post('/api/homework-help/:id/rate', authenticateToken, (req, res) => {
    const sessionId = req.params.id;
    const { rating } = req.body;
    const studentId = req.user.id;
    
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    db.run(
        'UPDATE homework_help_sessions SET student_rating = ? WHERE id = ? AND student_id = ?',
        [rating, sessionId, studentId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Session not found' });
            }
            res.json({ success: true });
        }
    );
});

// Usage limit checking function
async function checkUsageLimit(studentId, featureType) {
    return new Promise((resolve, reject) => {
        const today = new Date().toISOString().split('T')[0];
        
        db.get(
            'SELECT daily_usage, monthly_usage, last_reset_date, is_premium FROM usage_limits WHERE student_id = ? AND feature_type = ?',
            [studentId, featureType],
            (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!row) {
                    // Create new usage record
                    db.run(
                        'INSERT INTO usage_limits (student_id, feature_type, daily_usage, monthly_usage, last_reset_date) VALUES (?, ?, ?, ?, ?)',
                        [studentId, featureType, 0, 0, today],
                        (err) => {
                            if (err) reject(err);
                            else resolve({ allowed: true, limit: 3, used: 0, resetTime: 'midnight' });
                        }
                    );
                    return;
                }
                
                // Reset daily usage if it's a new day
                if (row.last_reset_date !== today) {
                    db.run(
                        'UPDATE usage_limits SET daily_usage = 0, last_reset_date = ? WHERE student_id = ? AND feature_type = ?',
                        [today, studentId, featureType]
                    );
                    row.daily_usage = 0;
                }
                
                const limit = row.is_premium ? 999 : 3;
                const allowed = row.daily_usage < limit;
                
                resolve({
                    allowed,
                    limit,
                    used: row.daily_usage,
                    resetTime: 'midnight',
                    isPremium: row.is_premium
                });
            }
        );
    });
}

// Update usage count function
function updateUsageCount(studentId, featureType) {
    db.run(
        'UPDATE usage_limits SET daily_usage = daily_usage + 1, monthly_usage = monthly_usage + 1 WHERE student_id = ? AND feature_type = ?',
        [studentId, featureType],
        (err) => {
            if (err) console.error('Error updating usage count:', err);
        }
    );
}

// AI Homework Help Generation
async function generateHomeworkHelp(questionText, subject) {
    // This is a simplified AI response generator
    // In a real implementation, you would integrate with OpenAI, Claude, or similar AI service
    
    const responses = {
        'Mathematics': {
            response: `我来帮你解决这个数学问题！让我先分析一下题目，然后一步步引导你找到答案。`,
            steps: [
                {
                    step: 1,
                    title: "理解题目",
                    content: "首先，让我们仔细阅读题目，确定要求解什么。",
                    hint: "找出题目中的关键信息和未知数"
                },
                {
                    step: 2,
                    title: "分析已知条件",
                    content: "列出题目中给出的所有已知信息。",
                    hint: "将文字描述转化为数学表达式"
                },
                {
                    step: 3,
                    title: "选择解题方法",
                    content: "根据题目类型选择合适的方法。",
                    hint: "考虑使用公式、画图或逻辑推理"
                },
                {
                    step: 4,
                    title: "执行计算",
                    content: "按照选定的方法进行计算。",
                    hint: "注意运算顺序和单位"
                },
                {
                    step: 5,
                    title: "验证答案",
                    content: "检查答案是否合理。",
                    hint: "将答案代入原题验证"
                }
            ],
            relatedConcepts: [
                { concept: "代数基础", difficulty: "初级", description: "变量和表达式的基本操作" },
                { concept: "方程求解", difficulty: "中级", description: "一元一次方程的解法" },
                { concept: "函数图像", difficulty: "中级", description: "线性函数的图像和性质" }
            ]
        },
        'Science': {
            response: `这是一个很有趣的科学问题！让我们用科学的方法来分析和解决它。`,
            steps: [
                {
                    step: 1,
                    title: "观察现象",
                    content: "仔细观察题目描述的现象或问题。",
                    hint: "注意细节和关键特征"
                },
                {
                    step: 2,
                    title: "提出假设",
                    content: "基于观察提出可能的解释。",
                    hint: "考虑相关的科学原理"
                },
                {
                    step: 3,
                    title: "设计实验",
                    content: "设计验证假设的方法。",
                    hint: "控制变量，确保实验的可靠性"
                },
                {
                    step: 4,
                    title: "分析数据",
                    content: "分析实验结果和数据。",
                    hint: "寻找模式和趋势"
                },
                {
                    step: 5,
                    title: "得出结论",
                    content: "基于分析得出结论。",
                    hint: "结论要与证据一致"
                }
            ],
            relatedConcepts: [
                { concept: "科学方法", difficulty: "初级", description: "观察、假设、实验、分析的基本步骤" },
                { concept: "数据分析", difficulty: "中级", description: "图表解读和统计方法" },
                { concept: "科学原理", difficulty: "中级", description: "相关学科的基础理论" }
            ]
        },
        'English Language Arts': {
            response: `让我们一起来分析这个语言文学问题！我会引导你深入理解文本和语言的使用。`,
            steps: [
                {
                    step: 1,
                    title: "理解文本",
                    content: "仔细阅读并理解文本的基本内容。",
                    hint: "注意主题、情节和人物"
                },
                {
                    step: 2,
                    title: "分析语言技巧",
                    content: "识别作者使用的修辞手法和语言技巧。",
                    hint: "寻找比喻、象征、对比等手法"
                },
                {
                    step: 3,
                    title: "探讨主题",
                    content: "分析文本的深层主题和意义。",
                    hint: "考虑作者的写作目的"
                },
                {
                    step: 4,
                    title: "联系背景",
                    content: "将文本与历史、文化背景联系。",
                    hint: "了解时代背景有助于理解"
                },
                {
                    step: 5,
                    title: "形成观点",
                    content: "基于分析形成自己的观点。",
                    hint: "用文本证据支持你的观点"
                }
            ],
            relatedConcepts: [
                { concept: "文学分析", difficulty: "中级", description: "文本分析和文学批评方法" },
                { concept: "修辞手法", difficulty: "中级", description: "比喻、象征、对比等技巧" },
                { concept: "写作技巧", difficulty: "高级", description: "议论文和说明文的写作方法" }
            ]
        }
    };
    
    const defaultResponse = {
        response: `这是一个很好的问题！让我来帮你分析和解决它。`,
        steps: [
            {
                step: 1,
                title: "分析问题",
                content: "首先，让我们理解问题的核心。",
                hint: "找出关键信息和目标"
            },
            {
                step: 2,
                title: "制定计划",
                content: "制定解决问题的步骤。",
                hint: "将复杂问题分解为简单步骤"
            },
            {
                step: 3,
                title: "执行计划",
                content: "按照计划逐步解决问题。",
                hint: "保持逻辑清晰"
            },
            {
                step: 4,
                title: "检查结果",
                content: "验证答案的正确性。",
                hint: "确保答案符合题目要求"
            }
        ],
        relatedConcepts: [
            { concept: "问题解决", difficulty: "初级", description: "系统性的问题分析方法" },
            { concept: "逻辑思维", difficulty: "中级", description: "推理和论证的基本技巧" }
        ]
    };
    
    return responses[subject] || defaultResponse;
}

// Diagnostic Test Routes
app.post('/api/diagnostic-test', authenticateToken, (req, res) => {
    const { subject, testType = 'adaptive' } = req.body;
    const studentId = req.user.id;
    
    // Generate diagnostic test questions
    const testQuestions = generateDiagnosticTest(subject, testType);
    
    // Record test session
    db.run(
        'INSERT INTO diagnostic_tests (student_id, subject, test_type, questions_answered, responses, test_duration) VALUES (?, ?, ?, ?, ?, ?)',
        [studentId, subject, testType, JSON.stringify([]), JSON.stringify([]), 0],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                testId: this.lastID,
                questions: testQuestions,
                estimatedTime: testQuestions.length * 2 // 2 minutes per question
            });
        }
    );
});

// Submit diagnostic test answers
app.post('/api/diagnostic-test/:id/submit', authenticateToken, (req, res) => {
    const testId = req.params.id;
    const { responses, testDuration } = req.body;
    const studentId = req.user.id;
    
    // Calculate ability estimate and recommendations
    const results = calculateDiagnosticResults(responses);
    
    db.run(
        'UPDATE diagnostic_tests SET responses = ?, ability_estimate = ?, recommended_topics = ?, test_duration = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND student_id = ?',
        [JSON.stringify(responses), results.abilityEstimate, JSON.stringify(results.recommendations), testDuration, testId, studentId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Update student knowledge mastery
            updateKnowledgeMastery(studentId, results.recommendations);
            
            res.json({
                abilityEstimate: results.abilityEstimate,
                recommendations: results.recommendations,
                strengths: results.strengths,
                weaknesses: results.weaknesses
            });
        }
    );
});

// Knowledge Graph Routes
app.get('/api/knowledge-graph/:subject', authenticateToken, (req, res) => {
    const subject = req.params.subject;
    const studentId = req.user.id;
    
    db.all(
        'SELECT * FROM knowledge_graph WHERE subject = ? ORDER BY difficulty_level, topic',
        [subject],
        (err, knowledgeNodes) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Get student mastery data
            db.all(
                'SELECT km.*, kg.topic FROM student_knowledge_mastery km JOIN knowledge_graph kg ON km.knowledge_node_id = kg.id WHERE km.student_id = ? AND kg.subject = ?',
                [studentId, subject],
                (err, masteryData) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    // Combine knowledge nodes with mastery data
                    const enrichedNodes = knowledgeNodes.map(node => {
                        const mastery = masteryData.find(m => m.knowledge_node_id === node.id);
                        return {
                            ...node,
                            prerequisite_topics: JSON.parse(node.prerequisite_topics || '[]'),
                            related_topics: JSON.parse(node.related_topics || '[]'),
                            learning_objectives: JSON.parse(node.learning_objectives || '[]'),
                            mastery: mastery ? {
                                level: mastery.mastery_level,
                                confidence: mastery.confidence_score,
                                lastPracticed: mastery.last_practiced,
                                practiceCount: mastery.practice_count
                            } : {
                                level: 0,
                                confidence: 0,
                                lastPracticed: null,
                                practiceCount: 0
                            }
                        };
                    });
                    
                    res.json(enrichedNodes);
                }
            );
        }
    );
});

// Learning Path Routes
app.get('/api/learning-path/:subject', authenticateToken, (req, res) => {
    const subject = req.params.subject;
    const studentId = req.user.id;
    
    db.get(
        'SELECT * FROM learning_paths WHERE student_id = ? AND subject = ? AND is_active = TRUE',
        [studentId, subject],
        (err, path) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (!path) {
                // Generate new learning path
                const newPath = generateLearningPath(studentId, subject);
                res.json(newPath);
            } else {
                path.path_structure = JSON.parse(path.path_structure || '[]');
                path.target_goals = JSON.parse(path.target_goals || '[]');
                res.json(path);
            }
        }
    );
});

// Helper Functions
function generateDiagnosticTest(subject, testType) {
    const questions = {
        'Mathematics': [
            {
                id: 1,
                question: "What is the value of x in the equation 2x + 5 = 13?",
                type: "multiple_choice",
                options: ["x = 3", "x = 4", "x = 5", "x = 6"],
                correct_answer: "x = 4",
                difficulty: 1,
                topic: "Algebra Basics"
            },
            {
                id: 2,
                question: "If y = 3x - 2, what is the value of y when x = 5?",
                type: "multiple_choice",
                options: ["y = 11", "y = 13", "y = 15", "y = 17"],
                correct_answer: "y = 13",
                difficulty: 1,
                topic: "Linear Equations"
            },
            {
                id: 3,
                question: "What is the slope of the line passing through points (2, 3) and (4, 7)?",
                type: "multiple_choice",
                options: ["slope = 1", "slope = 2", "slope = 3", "slope = 4"],
                correct_answer: "slope = 2",
                difficulty: 2,
                topic: "Linear Equations"
            }
        ],
        'Science': [
            {
                id: 4,
                question: "What is the chemical symbol for water?",
                type: "multiple_choice",
                options: ["H2O", "CO2", "NaCl", "O2"],
                correct_answer: "H2O",
                difficulty: 1,
                topic: "Basic Chemistry"
            },
            {
                id: 5,
                question: "What is the process by which plants make their own food?",
                type: "multiple_choice",
                options: ["Respiration", "Photosynthesis", "Digestion", "Fermentation"],
                correct_answer: "Photosynthesis",
                difficulty: 2,
                topic: "Biology"
            }
        ]
    };
    
    return questions[subject] || [];
}

function calculateDiagnosticResults(responses) {
    // Simplified ability estimation
    const correctAnswers = responses.filter(r => r.isCorrect).length;
    const totalQuestions = responses.length;
    const abilityEstimate = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    
    // Generate recommendations based on performance
    const recommendations = responses
        .filter(r => !r.isCorrect)
        .map(r => r.topic)
        .filter((topic, index, arr) => arr.indexOf(topic) === index); // Remove duplicates
    
    const strengths = responses
        .filter(r => r.isCorrect)
        .map(r => r.topic)
        .filter((topic, index, arr) => arr.indexOf(topic) === index);
    
    return {
        abilityEstimate,
        recommendations,
        strengths,
        weaknesses: recommendations
    };
}

function updateKnowledgeMastery(studentId, recommendations) {
    // Update mastery levels based on diagnostic results
    recommendations.forEach(topic => {
        db.run(
            'INSERT OR REPLACE INTO student_knowledge_mastery (student_id, knowledge_node_id, mastery_level, confidence_score, last_practiced, practice_count) SELECT ?, kg.id, 0.3, 0.5, CURRENT_TIMESTAMP, 1 FROM knowledge_graph kg WHERE kg.topic = ?',
            [studentId, topic]
        );
    });
}

function generateLearningPath(studentId, subject) {
    const pathStructure = [
        { step: 1, topic: "Basic Concepts", difficulty: 1, estimatedTime: 30 },
        { step: 2, topic: "Intermediate Skills", difficulty: 2, estimatedTime: 45 },
        { step: 3, topic: "Advanced Applications", difficulty: 3, estimatedTime: 60 },
        { step: 4, topic: "Mastery Practice", difficulty: 3, estimatedTime: 45 }
    ];
    
    const targetGoals = [
        "Master basic concepts",
        "Apply intermediate skills",
        "Solve complex problems",
        "Achieve subject mastery"
    ];
    
    // Save the learning path
    db.run(
        'INSERT INTO learning_paths (student_id, subject, path_name, target_goals, path_structure, estimated_completion_time) VALUES (?, ?, ?, ?, ?, ?)',
        [studentId, subject, `${subject} Learning Path`, JSON.stringify(targetGoals), JSON.stringify(pathStructure), 180],
        function(err) {
            if (err) console.error('Error creating learning path:', err);
        }
    );
    
    return {
        pathName: `${subject} Learning Path`,
        targetGoals,
        pathStructure,
        estimatedCompletionTime: 180,
        currentPosition: 0
    };
}

// Start server
app.listen(PORT, () => {
    console.log(`K12 AI Tutor Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});