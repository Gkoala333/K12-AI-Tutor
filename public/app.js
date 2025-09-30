// Global variables
let currentUser = null;
let currentToken = null;
let currentSubject = null;
let currentTopic = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let questionStartTime = null;
let questionTimer = null;
let currentSessionId = null;

// DOM elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const registerFields = document.getElementById('register-fields');
const authButtonText = document.getElementById('auth-button-text');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing K12 AI Tutor App');
    initializeApp();
    setupEventListeners();
    
    // Add global debug function
    window.debugApp = () => {
        console.log('=== K12 AI Tutor Debug Info ===');
        console.log('Current User:', currentUser);
        console.log('Current Token:', currentToken ? 'Present' : 'Missing');
        console.log('Current Subject:', currentSubject);
        console.log('Current Topic:', currentTopic);
        console.log('Current Questions:', currentQuestions.length);
        console.log('Current Question Index:', currentQuestionIndex);
        console.log('================================');
    };
    
    // Make loadSubjects globally accessible for debugging
    window.loadSubjects = loadSubjects;
    window.loadTopics = loadTopics;
});

function initializeApp() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        currentToken = token;
        loadUserProfile();
    } else {
        showAuthForm();
    }
}

function setupEventListeners() {
    // Auth form events
    loginTab.addEventListener('click', () => switchAuthMode('login'));
    registerTab.addEventListener('click', () => switchAuthMode('register'));
    authForm.addEventListener('submit', handleAuthSubmit);
    
    // Navigation events
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Practice events
    document.getElementById('submit-answer').addEventListener('click', submitAnswer);
    document.getElementById('next-question').addEventListener('click', loadNextQuestion);
    document.getElementById('hint-btn').addEventListener('click', showHint);
    
    // Goals events
    document.getElementById('add-goal-btn').addEventListener('click', showGoalModal);
    document.getElementById('cancel-goal').addEventListener('click', hideGoalModal);
    document.getElementById('goal-form').addEventListener('submit', addGoal);
    
    // Exam events
    document.querySelectorAll('.exam-card').forEach(card => {
        card.addEventListener('click', (e) => startExamPractice(e.currentTarget.dataset.exam));
    });
}

function switchAuthMode(mode) {
    if (mode === 'login') {
        loginTab.classList.add('bg-blue-500', 'text-white');
        loginTab.classList.remove('text-gray-600');
        registerTab.classList.remove('bg-blue-500', 'text-white');
        registerTab.classList.add('text-gray-600');
        registerFields.classList.add('hidden');
        authButtonText.textContent = 'Login';
    } else {
        registerTab.classList.add('bg-blue-500', 'text-white');
        registerTab.classList.remove('text-gray-600');
        loginTab.classList.remove('bg-blue-500', 'text-white');
        loginTab.classList.add('text-gray-600');
        registerFields.classList.remove('hidden');
        authButtonText.textContent = 'Register';
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;
    const gradeLevel = document.getElementById('grade-level').value;
    
    const isLogin = loginTab.classList.contains('bg-blue-500');
    
    try {
        let response;
        if (isLogin) {
            response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
        } else {
            if (!email || !gradeLevel) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, gradeLevel })
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            currentToken = data.token;
            currentUser = data.student;
            localStorage.setItem('token', currentToken);
            showApp();
            showNotification(`Welcome ${currentUser.username}!`, 'success');
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

async function loadUserProfile() {
    try {
        const response = await fetch('/api/student/profile', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            showApp();
        } else {
            localStorage.removeItem('token');
            showAuthForm();
        }
    } catch (error) {
        localStorage.removeItem('token');
        showAuthForm();
    }
}

function showAuthForm() {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
}

function showApp() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    updateUserInterface();
    loadDashboard();
}

function updateUserInterface() {
    document.getElementById('username-display').textContent = currentUser.username;
    document.getElementById('points-display').textContent = `${currentUser.total_points || 0} points`;
    document.getElementById('total-points').textContent = currentUser.total_points || 0;
    document.getElementById('current-level').textContent = currentUser.level || 1;
    document.getElementById('welcome-message').textContent = `Welcome back, ${currentUser.username}!`;
    document.getElementById('pet-display').textContent = getPetEmoji(currentUser.pet_type);
    
    // Show user info in nav
    document.getElementById('user-info').classList.remove('hidden');
}

function getPetEmoji(petType) {
    const petEmojis = {
        'dragon': '🐉',
        'cat': '🐱',
        'dog': '🐶',
        'bird': '🐦',
        'rabbit': '🐰'
    };
    return petEmojis[petType] || '🐉';
}

function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'text-blue-600', 'border-blue-600');
        btn.classList.add('text-gray-600');
    });
    
    const activeTabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTabButton) {
        activeTabButton.classList.add('active', 'text-blue-600', 'border-blue-600');
        activeTabButton.classList.remove('text-gray-600');
    }
    
    // Show/hide tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    const activeTabContent = document.getElementById(`${tabName}-tab`);
    if (activeTabContent) {
        activeTabContent.classList.remove('hidden');
    }
    
    // Load tab-specific content
    switch(tabName) {
        case 'dashboard':
            console.log('Loading dashboard...');
            loadDashboard();
            break;
        case 'practice':
            console.log('Loading practice subjects...');
            loadSubjects();
            break;
        case 'exams':
            console.log('Loading exams...');
            loadExams();
            break;
        case 'goals':
            console.log('Loading goals...');
            loadGoals();
            break;
        case 'homework':
            console.log('Loading homework help...');
            loadHomeworkHelp();
            break;
        case 'knowledge':
            console.log('Loading knowledge map...');
            loadKnowledgeMap();
            break;
        case 'pet':
            console.log('Loading pet shop...');
            loadPetShop();
            break;
        default:
            console.warn('Unknown tab:', tabName);
    }
}

async function loadDashboard() {
    // Load recent activity (mock data for now)
    const recentActivity = document.getElementById('recent-activity');
    recentActivity.innerHTML = `
        <div class="flex items-center p-3 bg-green-50 rounded-lg">
            <i class="fas fa-check-circle text-green-500 mr-3"></i>
            <div>
                <div class="font-semibold text-gray-800">Completed Algebra Practice</div>
                <div class="text-sm text-gray-600">Earned 50 points</div>
            </div>
        </div>
        <div class="flex items-center p-3 bg-blue-50 rounded-lg">
            <i class="fas fa-star text-blue-500 mr-3"></i>
            <div>
                <div class="font-semibold text-gray-800">Reached Level 2</div>
                <div class="text-sm text-gray-600">Your pet is evolving!</div>
            </div>
        </div>
    `;
    
    // Load progress chart
    loadProgressChart();
}

function loadProgressChart() {
    const ctx = document.getElementById('progress-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Points Earned',
                data: [120, 190, 300, 450],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function loadSubjects() {
    try {
        // Show loading state
        const subjectsGrid = document.getElementById('subjects-grid');
        subjectsGrid.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600">Loading subjects...</span>
            </div>
        `;
        
        const response = await fetch('/api/subjects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const subjects = await response.json();
        
        // Clear loading state
        subjectsGrid.innerHTML = '';
        
        if (subjects.length === 0) {
            subjectsGrid.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <i class="fas fa-book text-4xl mb-4"></i>
                    <p>No subjects available at the moment.</p>
                </div>
            `;
            return;
        }
        
        subjects.forEach(subject => {
            const subjectCard = document.createElement('div');
            subjectCard.className = 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all transform hover:scale-105';
            subjectCard.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-book text-4xl mb-4"></i>
                    <h4 class="text-xl font-bold mb-2">${subject.name}</h4>
                    <p class="text-blue-100 text-sm">${subject.description}</p>
                </div>
            `;
            
            // Add click event listener with error handling
            subjectCard.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Subject clicked:', subject.name);
                loadTopics(subject);
            });
            
            // Add hover effects
            subjectCard.addEventListener('mouseenter', () => {
                subjectCard.style.transform = 'scale(1.05)';
            });
            
            subjectCard.addEventListener('mouseleave', () => {
                subjectCard.style.transform = 'scale(1)';
            });
            
            subjectsGrid.appendChild(subjectCard);
        });
        
        console.log('Subjects loaded successfully:', subjects.length);
        
    } catch (error) {
        console.error('Error loading subjects:', error);
        const subjectsGrid = document.getElementById('subjects-grid');
        subjectsGrid.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Failed to load subjects. Please try again.</p>
                <button onclick="loadSubjects()" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <i class="fas fa-refresh mr-2"></i>Retry
                </button>
            </div>
        `;
        showNotification('Failed to load subjects', 'error');
    }
}

async function loadTopics(subject) {
    currentSubject = subject;
    
    try {
        console.log('Loading topics for subject:', subject.name);
        
        // Show loading state
        const topicsGrid = document.getElementById('topics-grid');
        topicsGrid.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600">Loading topics...</span>
            </div>
        `;
        
        // Show topics container
        document.getElementById('topics-container').classList.remove('hidden');
        
        const response = await fetch(`/api/subjects/${subject.id}/topics`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const topics = await response.json();
        
        // Clear loading state
        topicsGrid.innerHTML = '';
        
        if (topics.length === 0) {
            topicsGrid.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <i class="fas fa-list text-4xl mb-4"></i>
                    <p>No topics available for ${subject.name}.</p>
                </div>
            `;
            return;
        }
        
        topics.forEach(topic => {
            const topicCard = document.createElement('div');
            topicCard.className = 'bg-white border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all';
            topicCard.innerHTML = `
                <div class="text-center">
                    <div class="text-3xl mb-3">${getTopicEmoji(topic.name)}</div>
                    <h4 class="text-lg font-bold text-gray-800 mb-2">${topic.name}</h4>
                    <p class="text-gray-600 text-sm mb-3">${topic.description}</p>
                    <div class="flex justify-center space-x-2">
                        ${Array.from({length: topic.difficulty_level}, (_, i) => 
                            '<i class="fas fa-star text-yellow-400"></i>'
                        ).join('')}
                    </div>
                </div>
            `;
            
            // Add click event listener with error handling
            topicCard.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Topic clicked:', topic.name);
                startPractice(topic);
            });
            
            // Add hover effects
            topicCard.addEventListener('mouseenter', () => {
                topicCard.style.borderColor = '#3b82f6';
                topicCard.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
            });
            
            topicCard.addEventListener('mouseleave', () => {
                topicCard.style.borderColor = '#e5e7eb';
                topicCard.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            });
            
            topicsGrid.appendChild(topicCard);
        });
        
        console.log('Topics loaded successfully:', topics.length);
        showNotification(`Loaded ${topics.length} topics for ${subject.name}`, 'success');
        
    } catch (error) {
        console.error('Error loading topics:', error);
        const topicsGrid = document.getElementById('topics-grid');
        topicsGrid.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Failed to load topics for ${subject.name}.</p>
                <button onclick="loadTopics(currentSubject)" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <i class="fas fa-refresh mr-2"></i>Retry
                </button>
            </div>
        `;
        showNotification('Failed to load topics', 'error');
    }
}

function getTopicEmoji(topicName) {
    const emojis = {
        'Algebra Basics': '🔢',
        'Linear Equations': '📈',
        'Quadratic Functions': '📊',
        'Geometry': '📐',
        'Statistics': '📊'
    };
    return emojis[topicName] || '📚';
}

async function startPractice(topic) {
    currentTopic = topic;
    
    try {
        const response = await fetch(`/api/topics/${topic.id}/questions?limit=5`);
        currentQuestions = await response.json();
        currentQuestionIndex = 0;
        
        // Start a new study session
        const sessionResponse = await fetch('/api/study-sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                sessionType: 'practice',
                subjectId: currentSubject.id,
                topicId: topic.id
            })
        });
        
        if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            currentSessionId = sessionData.sessionId;
        }
        
        loadCurrentQuestion();
        document.getElementById('question-container').classList.remove('hidden');
    } catch (error) {
        showNotification('Failed to load questions', 'error');
    }
}

function loadCurrentQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        completePracticeSession();
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    questionStartTime = Date.now();
    
    // Start timer
    startQuestionTimer();
    
    // Update question display
    document.getElementById('question-text').textContent = question.question_text;
    
    const optionsContainer = document.getElementById('question-options');
    optionsContainer.innerHTML = '';
    
    if (question.question_type === 'multiple_choice' && question.options) {
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors';
            optionElement.innerHTML = `
                <input type="radio" name="answer" value="${option}" id="option-${index}" class="mr-3">
                <label for="option-${index}" class="flex-1 cursor-pointer">${option}</label>
            `;
            optionElement.addEventListener('click', () => {
                document.getElementById(`option-${index}`).checked = true;
            });
            optionsContainer.appendChild(optionElement);
        });
    } else {
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
        inputElement.placeholder = 'Enter your answer...';
        inputElement.id = 'text-answer';
        optionsContainer.appendChild(inputElement);
    }
    
    // Reset buttons
    document.getElementById('submit-answer').classList.remove('hidden');
    document.getElementById('next-question').classList.add('hidden');
    document.getElementById('answer-feedback').classList.add('hidden');
}

function startQuestionTimer() {
    let seconds = 0;
    questionTimer = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        document.getElementById('question-timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopQuestionTimer() {
    if (questionTimer) {
        clearInterval(questionTimer);
        questionTimer = null;
    }
}

async function submitAnswer() {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    stopQuestionTimer();
    
    let studentAnswer = '';
    const radioButtons = document.querySelectorAll('input[name="answer"]:checked');
    if (radioButtons.length > 0) {
        studentAnswer = radioButtons[0].value;
    } else {
        const textInput = document.getElementById('text-answer');
        if (textInput) {
            studentAnswer = textInput.value;
        }
    }
    
    if (!studentAnswer) {
        showNotification('Please select or enter an answer', 'error');
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    
    try {
        const response = await fetch(`/api/questions/${question.id}/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                studentAnswer,
                timeSpent
            })
        });
        
        const result = await response.json();
        showAnswerFeedback(result, studentAnswer);
        
        // Update user points if correct
        if (result.isCorrect) {
            currentUser.total_points += result.pointsEarned;
            updateUserInterface();
            showFloatingPoints(result.pointsEarned);
        }
        
    } catch (error) {
        showNotification('Failed to submit answer', 'error');
    }
}

function showAnswerFeedback(result, studentAnswer) {
    const feedbackContainer = document.getElementById('feedback-content');
    const isCorrect = result.isCorrect;
    
    feedbackContainer.innerHTML = `
        <div class="text-center mb-6">
            <div class="text-6xl mb-4">${isCorrect ? '🎉' : '🤔'}</div>
            <h3 class="text-2xl font-bold ${isCorrect ? 'text-green-600' : 'text-orange-600'} mb-2">
                ${isCorrect ? 'Correct!' : 'Not quite right'}
            </h3>
            <p class="text-gray-600">${result.feedback.message}</p>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-gray-800 mb-2">Your Answer:</h4>
            <p class="text-gray-600">${studentAnswer}</p>
        </div>
        
        <div class="bg-green-50 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-gray-800 mb-2">Correct Answer:</h4>
            <p class="text-gray-600">${result.correctAnswer}</p>
        </div>
        
        <div class="bg-blue-50 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-gray-800 mb-2">Explanation:</h4>
            <p class="text-gray-600">${result.explanation}</p>
        </div>
        
        <div class="text-center">
            <p class="text-sm text-gray-600 mb-2">${result.feedback.suggestion}</p>
            ${isCorrect ? `<div class="text-green-600 font-semibold">+${result.pointsEarned} points earned!</div>` : ''}
        </div>
    `;
    
    document.getElementById('answer-feedback').classList.remove('hidden');
    document.getElementById('submit-answer').classList.add('hidden');
    document.getElementById('next-question').classList.remove('hidden');
}

function showFloatingPoints(points) {
    const floatingPoints = document.createElement('div');
    floatingPoints.className = 'floating-points';
    floatingPoints.textContent = `+${points}`;
    floatingPoints.style.left = Math.random() * 200 + 'px';
    floatingPoints.style.top = Math.random() * 100 + 'px';
    
    document.body.appendChild(floatingPoints);
    
    setTimeout(() => {
        document.body.removeChild(floatingPoints);
    }, 1000);
}

function loadNextQuestion() {
    currentQuestionIndex++;
    loadCurrentQuestion();
}

function showHint() {
    showNotification('Hint: Think about the basic concepts first!', 'info');
}

async function completePracticeSession() {
    // Update session completion
    if (currentSessionId) {
        try {
            await fetch(`/api/study-sessions/${currentSessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({
                    questionsAnswered: currentQuestions.length,
                    correctAnswers: currentQuestions.filter((_, index) => index < currentQuestionIndex).length,
                    pointsEarned: currentUser.total_points,
                    sessionDuration: Math.floor((Date.now() - questionStartTime) / 1000)
                })
            });
        } catch (error) {
            console.error('Failed to update session:', error);
        }
    }
    
    showNotification('Practice session completed! Great job! 🎉', 'success');
    document.getElementById('question-container').classList.add('hidden');
    document.getElementById('topics-container').classList.add('hidden');
}

async function startExamPractice(examType) {
    try {
        const response = await fetch(`/api/exams/${examType}/questions?limit=10`);
        const questions = await response.json();
        
        if (questions.length === 0) {
            showNotification('No questions available for this exam type', 'error');
            return;
        }
        
        showNotification(`Starting ${examType} practice with ${questions.length} questions!`, 'info');
        // Here you would implement the exam interface
        // For now, just show a success message
    } catch (error) {
        showNotification('Failed to load exam questions', 'error');
    }
}

async function loadGoals() {
    try {
        const response = await fetch('/api/learning-goals', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const goals = await response.json();
        
        const goalsList = document.getElementById('goals-list');
        goalsList.innerHTML = '';
        
        if (goals.length === 0) {
            goalsList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-target text-4xl mb-4"></i>
                    <p>No goals set yet. Create your first learning goal!</p>
                </div>
            `;
            return;
        }
        
        goals.forEach(goal => {
            const goalElement = document.createElement('div');
            goalElement.className = 'bg-gray-50 rounded-lg p-4';
            goalElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-gray-800">${goal.goal_type.replace('_', ' ').toUpperCase()}</h4>
                        <p class="text-gray-600">Target: ${goal.target_value}</p>
                        <p class="text-sm text-gray-500">Due: ${new Date(goal.target_date).toLocaleDateString()}</p>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-blue-600">${goal.current_value}</div>
                        <div class="text-sm text-gray-500">Current</div>
                    </div>
                </div>
                <div class="mt-3">
                    <div class="bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full" style="width: ${Math.min(100, (parseInt(goal.current_value) / parseInt(goal.target_value)) * 100)}%"></div>
                    </div>
                </div>
            `;
            goalsList.appendChild(goalElement);
        });
    } catch (error) {
        showNotification('Failed to load goals', 'error');
    }
}

function showGoalModal() {
    document.getElementById('goal-modal').classList.remove('hidden');
    document.getElementById('goal-modal').classList.add('flex');
}

function hideGoalModal() {
    document.getElementById('goal-modal').classList.add('hidden');
    document.getElementById('goal-modal').classList.remove('flex');
}

async function addGoal(e) {
    e.preventDefault();
    
    const goalType = document.getElementById('goal-type').value;
    const targetValue = document.getElementById('target-value').value;
    const targetDate = document.getElementById('target-date').value;
    
    try {
        const response = await fetch('/api/learning-goals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ goalType, targetValue, targetDate })
        });
        
        if (response.ok) {
            hideGoalModal();
            loadGoals();
            showNotification('Goal added successfully!', 'success');
            document.getElementById('goal-form').reset();
        } else {
            const error = await response.json();
            showNotification(error.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to add goal', 'error');
    }
}

async function loadPetShop() {
    try {
        const response = await fetch('/api/pet/items');
        const items = await response.json();
        
        const itemsGrid = document.getElementById('pet-items-grid');
        itemsGrid.innerHTML = '';
        
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'bg-white border-2 border-gray-200 rounded-xl p-6 text-center hover:border-pink-500 transition-all';
            itemElement.innerHTML = `
                <div class="text-4xl mb-4">${getItemEmoji(item.type)}</div>
                <h4 class="text-lg font-bold text-gray-800 mb-2">${item.name}</h4>
                <p class="text-gray-600 text-sm mb-4">${item.description}</p>
                <div class="flex justify-between items-center">
                    <div class="text-blue-600 font-semibold">${item.cost} points</div>
                    <button class="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors purchase-item" data-item-id="${item.id}" data-cost="${item.cost}">
                        Buy
                    </button>
                </div>
            `;
            itemsGrid.appendChild(itemElement);
        });
        
        // Add purchase event listeners
        document.querySelectorAll('.purchase-item').forEach(button => {
            button.addEventListener('click', (e) => purchaseItem(e.target.dataset.itemId, e.target.dataset.cost));
        });
    } catch (error) {
        showNotification('Failed to load pet items', 'error');
    }
}

function getItemEmoji(itemType) {
    const emojis = {
        'food': '🍎',
        'toy': '🎾',
        'accessory': '👑'
    };
    return emojis[itemType] || '🎁';
}

async function purchaseItem(itemId, cost) {
    if (currentUser.total_points < parseInt(cost)) {
        showNotification('Not enough points!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/pet/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ itemId: parseInt(itemId) })
        });
        
        if (response.ok) {
            const result = await response.json();
            currentUser.total_points = result.pointsRemaining;
            updateUserInterface();
            showNotification('Item purchased successfully!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to purchase item', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentToken = null;
    currentUser = null;
    showAuthForm();
    showNotification('Logged out successfully', 'info');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Homework Help Functions
async function loadHomeworkHelp() {
    // Load homework history
    try {
        const response = await fetch('/api/homework-help/history', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const history = await response.json();
        displayHomeworkHistory(history);
    } catch (error) {
        console.error('Error loading homework history:', error);
    }
    
    // Setup event listeners
    document.getElementById('submit-homework').addEventListener('click', submitHomeworkQuestion);
    document.getElementById('new-homework-question').addEventListener('click', resetHomeworkForm);
    
    // Rating stars
    document.querySelectorAll('.rating-star').forEach(star => {
        star.addEventListener('click', (e) => rateHomeworkHelp(e.target.dataset.rating));
    });
}

async function submitHomeworkQuestion() {
    const subject = document.getElementById('homework-subject').value;
    const questionText = document.getElementById('homework-question').value;
    const imageFile = document.getElementById('homework-image').files[0];
    
    if (!subject || !questionText) {
        showNotification('Please select a subject and enter your question', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('questionText', questionText);
        formData.append('subject', subject);
        formData.append('questionType', imageFile ? 'image' : 'text');
        
        if (imageFile) {
            formData.append('questionImage', imageFile);
        }
        
        const response = await fetch('/api/homework-help', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        
        if (response.status === 429) {
            const error = await response.json();
            showNotification(`Daily limit reached! You've used ${error.used}/${error.limit} questions today.`, 'error');
            return;
        }
        
        if (!response.ok) {
            const error = await response.json();
            showNotification(error.error, 'error');
            return;
        }
        
        const result = await response.json();
        displayHomeworkResponse(result);
        
        // Update user points
        currentUser.total_points += result.pointsEarned;
        updateUserInterface();
        showFloatingPoints(result.pointsEarned);
        
        showNotification('Homework help received! +5 points earned!', 'success');
        
    } catch (error) {
        showNotification('Failed to get homework help', 'error');
    }
}

function displayHomeworkResponse(result) {
    // Display AI response
    document.getElementById('homework-ai-response').innerHTML = `
        <div class="bg-blue-50 rounded-lg p-4">
            <p class="text-gray-800">${result.response}</p>
        </div>
    `;
    
    // Display steps
    const stepsContainer = document.getElementById('homework-steps');
    stepsContainer.innerHTML = '<h4 class="font-semibold text-gray-800 mb-3">Step-by-Step Guidance:</h4>';
    
    result.steps.forEach((step, index) => {
        const stepElement = document.createElement('div');
        stepElement.className = 'bg-gray-50 rounded-lg p-4 mb-3';
        stepElement.innerHTML = `
            <div class="flex items-start">
                <div class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">${step.step}</div>
                <div class="flex-1">
                    <h5 class="font-semibold text-gray-800 mb-2">${step.title}</h5>
                    <p class="text-gray-600 mb-2">${step.content}</p>
                    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-2">
                        <p class="text-sm text-yellow-800"><i class="fas fa-lightbulb mr-1"></i>${step.hint}</p>
                    </div>
                </div>
            </div>
        `;
        stepsContainer.appendChild(stepElement);
    });
    
    // Display related concepts
    const conceptsContainer = document.getElementById('homework-concepts');
    conceptsContainer.innerHTML = '<h4 class="font-semibold text-gray-800 mb-3">Related Concepts to Study:</h4>';
    
    result.relatedConcepts.forEach(concept => {
        const conceptElement = document.createElement('div');
        conceptElement.className = 'bg-green-50 rounded-lg p-3 mb-2';
        conceptElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h6 class="font-semibold text-gray-800">${concept.concept}</h6>
                    <p class="text-sm text-gray-600">${concept.description}</p>
                </div>
                <span class="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs">${concept.difficulty}</span>
            </div>
        `;
        conceptsContainer.appendChild(conceptElement);
    });
    
    // Show response section
    document.getElementById('homework-response').classList.remove('hidden');
    
    // Store session ID for rating
    document.getElementById('homework-response').dataset.sessionId = result.sessionId;
}

function displayHomeworkHistory(history) {
    const historyContainer = document.getElementById('homework-history');
    
    if (history.length === 0) {
        historyContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-question-circle text-4xl mb-4"></i>
                <p>No homework questions yet. Ask your first question!</p>
            </div>
        `;
        return;
    }
    
    historyContainer.innerHTML = '';
    history.forEach(session => {
        const historyElement = document.createElement('div');
        historyElement.className = 'bg-gray-50 rounded-lg p-4 mb-3';
        historyElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h6 class="font-semibold text-gray-800 mb-1">${session.subject}</h6>
                    <p class="text-sm text-gray-600 mb-2">${session.question_text.substring(0, 100)}${session.question_text.length > 100 ? '...' : ''}</p>
                    <div class="flex items-center space-x-4 text-xs text-gray-500">
                        <span><i class="fas fa-calendar mr-1"></i>${new Date(session.created_at).toLocaleDateString()}</span>
                        ${session.student_rating ? `<span><i class="fas fa-star mr-1"></i>${session.student_rating}/5</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        historyContainer.appendChild(historyElement);
    });
}

function resetHomeworkForm() {
    document.getElementById('homework-subject').value = '';
    document.getElementById('homework-question').value = '';
    document.getElementById('homework-image').value = '';
    document.getElementById('homework-response').classList.add('hidden');
}

async function rateHomeworkHelp(rating) {
    const sessionId = document.getElementById('homework-response').dataset.sessionId;
    if (!sessionId) return;
    
    try {
        const response = await fetch(`/api/homework-help/${sessionId}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ rating: parseInt(rating) })
        });
        
        if (response.ok) {
            // Update star display
            document.querySelectorAll('.rating-star').forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('text-yellow-400');
                    star.classList.remove('text-gray-300');
                } else {
                    star.classList.remove('text-yellow-400');
                    star.classList.add('text-gray-300');
                }
            });
            
            showNotification('Thank you for your rating!', 'success');
        }
    } catch (error) {
        console.error('Error rating homework help:', error);
    }
}

// Knowledge Map Functions
async function loadKnowledgeMap() {
    const subject = document.getElementById('knowledge-subject').value;
    await loadKnowledgeGraph(subject);
    await loadLearningPath(subject);
    
    // Setup event listeners
    document.getElementById('knowledge-subject').addEventListener('change', (e) => {
        loadKnowledgeMap();
    });
    
    document.getElementById('start-diagnostic').addEventListener('click', startDiagnosticTest);
}

async function loadKnowledgeGraph(subject) {
    try {
        const response = await fetch(`/api/knowledge-graph/${subject}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const knowledgeNodes = await response.json();
        renderKnowledgeMap(knowledgeNodes);
    } catch (error) {
        console.error('Error loading knowledge graph:', error);
    }
}

function renderKnowledgeMap(nodes) {
    const canvas = document.getElementById('knowledge-map');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Simple network visualization
    const nodeRadius = 20;
    const positions = [];
    
    // Calculate positions for nodes
    nodes.forEach((node, index) => {
        const angle = (2 * Math.PI * index) / nodes.length;
        const radius = 150;
        const x = canvas.width / 2 + radius * Math.cos(angle);
        const y = canvas.height / 2 + radius * Math.sin(angle);
        positions.push({ x, y, node });
    });
    
    // Draw connections
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    positions.forEach((pos, index) => {
        pos.node.related_topics.forEach(relatedTopic => {
            const relatedIndex = nodes.findIndex(n => n.topic === relatedTopic);
            if (relatedIndex !== -1) {
                const relatedPos = positions[relatedIndex];
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(relatedPos.x, relatedPos.y);
                ctx.stroke();
            }
        });
    });
    
    // Draw nodes
    positions.forEach(pos => {
        const mastery = pos.node.mastery.level;
        let color;
        if (mastery < 0.3) color = '#ef4444'; // Red
        else if (mastery < 0.7) color = '#f59e0b'; // Yellow
        else color = '#10b981'; // Green
        
        // Draw node
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw mastery percentage
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(mastery * 100)}%`, pos.x, pos.y + 4);
        
        // Draw topic name
        ctx.fillStyle = '#374151';
        ctx.font = '10px Arial';
        ctx.fillText(pos.node.topic.substring(0, 10), pos.x, pos.y + nodeRadius + 15);
    });
}

async function loadLearningPath(subject) {
    try {
        const response = await fetch(`/api/learning-path/${subject}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const path = await response.json();
        displayLearningPath(path);
    } catch (error) {
        console.error('Error loading learning path:', error);
    }
}

function displayLearningPath(path) {
    const container = document.getElementById('learning-path-preview');
    
    if (!path) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No learning path available</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-2">
            <h5 class="font-semibold text-gray-800">${path.pathName}</h5>
            <div class="space-y-1">
                ${path.pathStructure.map((step, index) => `
                    <div class="flex items-center text-sm">
                        <div class="w-6 h-6 rounded-full ${index <= path.currentPosition ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'} flex items-center justify-center text-xs font-bold mr-2">${step.step}</div>
                        <span class="text-gray-700">${step.topic}</span>
                        <span class="ml-auto text-gray-500">${step.estimatedTime}min</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function startDiagnosticTest() {
    const subject = document.getElementById('knowledge-subject').value;
    
    try {
        const response = await fetch('/api/diagnostic-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ subject, testType: 'adaptive' })
        });
        
        const test = await response.json();
        showDiagnosticTest(test);
        
    } catch (error) {
        showNotification('Failed to start diagnostic test', 'error');
    }
}

function showDiagnosticTest(test) {
    // Create modal for diagnostic test
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Diagnostic Test - ${test.questions[0]?.topic || 'General'}</h3>
            <div id="diagnostic-questions">
                ${test.questions.map((question, index) => `
                    <div class="question-item mb-6 ${index === 0 ? '' : 'hidden'}">
                        <h4 class="font-semibold text-gray-800 mb-3">Question ${index + 1}: ${question.question}</h4>
                        <div class="space-y-2">
                            ${question.options.map(option => `
                                <label class="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                    <input type="radio" name="q${index}" value="${option}" class="mr-3">
                                    <span>${option}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="flex justify-between mt-6">
                <button id="prev-question" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors hidden">Previous</button>
                <button id="next-question" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">Next</button>
                <button id="submit-test" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors hidden">Submit Test</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add test logic
    let currentQuestion = 0;
    const totalQuestions = test.questions.length;
    const responses = [];
    
    function showQuestion(index) {
        document.querySelectorAll('.question-item').forEach((item, i) => {
            item.classList.toggle('hidden', i !== index);
        });
        
        document.getElementById('prev-question').classList.toggle('hidden', index === 0);
        document.getElementById('next-question').classList.toggle('hidden', index === totalQuestions - 1);
        document.getElementById('submit-test').classList.toggle('hidden', index !== totalQuestions - 1);
    }
    
    document.getElementById('next-question').addEventListener('click', () => {
        // Save current response
        const selected = document.querySelector(`input[name="q${currentQuestion}"]:checked`);
        responses[currentQuestion] = {
            questionId: test.questions[currentQuestion].id,
            answer: selected ? selected.value : '',
            isCorrect: selected ? selected.value === test.questions[currentQuestion].correct_answer : false,
            topic: test.questions[currentQuestion].topic
        };
        
        if (currentQuestion < totalQuestions - 1) {
            currentQuestion++;
            showQuestion(currentQuestion);
        }
    });
    
    document.getElementById('prev-question').addEventListener('click', () => {
        if (currentQuestion > 0) {
            currentQuestion--;
            showQuestion(currentQuestion);
        }
    });
    
    document.getElementById('submit-test').addEventListener('click', async () => {
        // Save final response
        const selected = document.querySelector(`input[name="q${currentQuestion}"]:checked`);
        responses[currentQuestion] = {
            questionId: test.questions[currentQuestion].id,
            answer: selected ? selected.value : '',
            isCorrect: selected ? selected.value === test.questions[currentQuestion].correct_answer : false,
            topic: test.questions[currentQuestion].topic
        };
        
        // Submit test
        try {
            const response = await fetch(`/api/diagnostic-test/${test.testId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ responses, testDuration: 300 })
            });
            
            const results = await response.json();
            showDiagnosticResults(results);
            document.body.removeChild(modal);
            
        } catch (error) {
            showNotification('Failed to submit test', 'error');
        }
    });
}

function showDiagnosticResults(results) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
            <h3 class="text-xl font-bold text-gray-800 mb-6">Diagnostic Test Results</h3>
            <div class="space-y-4">
                <div class="bg-blue-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-800 mb-2">Overall Performance</h4>
                    <p class="text-2xl font-bold text-blue-600">${Math.round(results.abilityEstimate * 100)}%</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-green-50 rounded-lg p-4">
                        <h4 class="font-semibold text-gray-800 mb-2">Strengths</h4>
                        <ul class="text-sm text-gray-600">
                            ${results.strengths.map(strength => `<li>• ${strength}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="bg-red-50 rounded-lg p-4">
                        <h4 class="font-semibold text-gray-800 mb-2">Areas to Improve</h4>
                        <ul class="text-sm text-gray-600">
                            ${results.weaknesses.map(weakness => `<li>• ${weakness}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            <div class="mt-6 text-center">
                <button id="close-results" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-results').addEventListener('click', () => {
        document.body.removeChild(modal);
        loadKnowledgeMap(); // Refresh knowledge map
    });
}

// Initialize the app
initializeApp();
