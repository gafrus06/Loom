const AITUNNEL_API_KEY = process.env.REACT_APP_AITUNNEL_API_KEY;
const AITUNNEL_API_URL = 'https://api.aitunnel.ru/v1/chat/completions';

const AI_MODELS = [
    'gpt-4o-mini',   // основная
    'deepseek-r1',   // fallback
    'gpt-3.5-turbo'  // fallback
];

// Храни историю чата для контекста
let chatMessagesHistory = [];

/**
 * Отправляет запрос AI с учетом всей истории чата
 */
export async function analyzeDetachmentWithAI(detachmentData, userQuery) {
    if (!AITUNNEL_API_KEY) {
        throw new Error('AITunnel API ключ не настроен');
    }

    // Добавляем новое сообщение пользователя в историю
    chatMessagesHistory.push({ role: 'user', content: userQuery });

    let lastError = null;

    for (const model of AI_MODELS) {
        try {
            console.log(`🔄 Пробуем модель: ${model}...`);

            const detachmentPrompt = createAITunnelPrompt(detachmentData);

            // Формируем массив сообщений для AI
            const messagesForAI = [
                {
                    role: 'system',
                    content: `Ты — опытный вожатый детского лагеря. Общайся естественно и дружелюбно. 
- На приветствия отвечай приветствием
- На короткие вопросы отвечай коротко
- На просьбы об анализе давай структурированный ответ
- Эмодзи используй умеренно
- Не повторяй шаблонные фразы`
                },
                { role: 'user', content: detachmentPrompt },
                ...chatMessagesHistory
            ];

            const response = await fetch(AITUNNEL_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AITUNNEL_API_KEY}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messagesForAI,
                    temperature: 0.8,
                    max_tokens: 1000,
                    stream: false
                }),
                signal: AbortSignal.timeout(45000)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Модель ${model} ошибка:`, response.status, errorText);
                if (response.status === 404) {
                    lastError = new Error(`Модель ${model} не найдена`);
                    continue;
                }
                throw new Error(`Ошибка AITunnel API (${response.status})`);
            }

            const data = await response.json();
            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Неверный формат ответа от AITunnel');
            }

            const aiResponse = data.choices[0].message.content;
            console.log('✅ AI ответ:', aiResponse);

            // Сохраняем ответ AI в историю
            chatMessagesHistory.push({ role: 'assistant', content: aiResponse });

            return aiResponse;

        } catch (error) {
            console.error(`❌ Модель ${model} не сработала:`, error.message);
            lastError = error;
            if (!error.message.includes('404') && !error.message.includes('timeout') && !error.message.includes('timed out')) {
                break;
            }
        }
    }

    console.error('Все модели AITunnel недоступны');
    throw lastError || new Error('❌ Сервис AITunnel недоступен');
}

/**
 * Сбрасывает историю чата (если нужно начать новый сеанс)
 */
export function resetChatHistory() {
    chatMessagesHistory = [];
}

/**
 * Создает контекст отряда для AI
 */
function createAITunnelPrompt(detachmentData, userQuery = '') {
    const { detachment, memberships, counselors } = detachmentData;

    // Формируем подробную инфу о каждом ребенке
    const childrenDetails = memberships
        .map(m => m.child)
        .filter(Boolean)
        .map(child => {
            const age = calculateAge(child.birthDate);
            return `
- Имя: ${child.firstName || 'Без имени'} ${child.lastName || ''}
- Возраст: ${age ?? '?'}
- Пол: ${child.gender === 'MALE' ? 'М' : child.gender === 'FEMALE' ? 'Ж' : '?'}
- Город: ${child.homeCity || '-'}
- Аллергии: ${child.allergies || '-'}
- Медицинские заметки: ${child.medicalNotes || '-'}
- Особые потребности: ${child.specialNeeds || '-'}
- Поведенческие особенности: ${child.behavioralNotes || '-'}
`.trim();
        })
        .join('\n');

    const activeCounselors = counselors.filter(c => c.active).length;

    return `Информация об отряде "${detachment.name}":
- Этап: ${getStageName(detachment.stage)}
- Вожатых: ${activeCounselors}

Детали детей:
${childrenDetails}

Запрос вожатого: "${userQuery}"

Ответь как опытный вожатый, естественно и дружелюбно, учитывая все предоставленные данные каждого ребёнка.`;
}


// Остальные функции calculateAge и getStageName оставляем без изменений


function calculateAge(birthDate) {
    if (!birthDate) return null;
    try {
        const birth = new Date(birthDate);
        if (isNaN(birth.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    } catch {
        return null;
    }
}

function getStageName(stage) {
    const stages = {
        'NEW': 'организационный',
        'ORGANIZATIONAL': 'оргпериод',
        'BUSINESS': 'основной',
        'CONSTRUCTIVE': 'основной',
        'FINAL': 'заключительный',
        'COMPLETED': 'завершен'
    };
    return stages[stage] || stage || 'не указан';
}