# Нагрузочное тестирование Loom через k6

Эта папка содержит k6-сценарий для проверки backend через `api-gateway`.

Базовый адрес по умолчанию:

```powershell
http://localhost:12717
```

## Что тестируем

Сценарий `loom-api.js` имитирует пользовательский путь:

1. Проверка доступности gateway: `GET /actuator/health`.
2. Регистрация тестовых пользователей в `setup`.
3. Авторизация: `POST /api/auth/login`.
4. Получение профиля: `GET /api/users/profile`.
5. Проверка заполненности профиля: `GET /api/users/profile/completion-status`.
6. Подгрузка ленты новостей: `GET /api/feed/my-feed?filter=all&page=0&size=20`.

Если нужно тестировать только `auth-service`, запустите с `AUTH_ONLY=true`.

## 4 вида нагрузки для диплома

| Профиль | Назначение | Команда |
| --- | --- | --- |
| `load` | Обычная рабочая нагрузка, базовый сценарий около 5 минут | `k6 run -e PROFILE=load load-tests/loom-api.js` |
| `stress` | Нагрузка выше ожидаемой, поиск предела | `k6 run -e PROFILE=stress load-tests/loom-api.js` |
| `spike` | Резкий пик пользователей | `k6 run -e PROFILE=spike load-tests/loom-api.js` |
| `soak` | Долгая стабильная нагрузка | `k6 run -e PROFILE=soak load-tests/loom-api.js` |

## Подготовка

1. Запустите инфраструктуру: PostgreSQL, Kafka, Redis, MinIO и другие зависимости проекта.
2. Запустите `eureka-server`.
3. Запустите сервисы `auth-service`, `user-service`, `api-gateway` и остальные сервисы, которые участвуют в проверяемом пользовательском пути.
4. Убедитесь, что gateway отвечает:

```powershell
Invoke-WebRequest http://localhost:12717/actuator/health
```

5. Установите k6:

```powershell
winget install k6.k6
```

## Запуск

Обычная нагрузка:

```powershell
k6 run -e PROFILE=load load-tests/loom-api.js
```

Стресс-тест:

```powershell
k6 run -e PROFILE=stress load-tests/loom-api.js
```

Пиковая нагрузка:

```powershell
k6 run -e PROFILE=spike load-tests/loom-api.js
```

Длительная нагрузка:

```powershell
k6 run -e PROFILE=soak -e SOAK_DURATION=1h load-tests/loom-api.js
```

Если gateway запущен на другом адресе:

```powershell
k6 run -e BASE_URL=http://localhost:12717 -e PROFILE=load load-tests/loom-api.js
```

Если профиль пользователя ещё не создаётся через Kafka/outbox или временно нужен только auth:

```powershell
k6 run -e PROFILE=load -e AUTH_ONLY=true load-tests/loom-api.js
```

## Результаты

После запуска k6 сохранит JSON-отчёт:

```text
load-tests/results/<profile>-summary.json
```

Для диплома фиксируйте:

- количество виртуальных пользователей;
- общее количество запросов;
- процент ошибок `http_req_failed`;
- `p95` и `p99` времени ответа;
- пропускную способность `http_reqs`;
- момент, когда при `stress` начинают расти ошибки или задержки.

## Как описать методику в дипломе

Пример формулировки:

> Нагрузочное тестирование выполнялось инструментом k6. Запросы направлялись на API Gateway, что позволило проверить не только отдельные REST endpoints, но и взаимодействие gateway с микросервисами. Были проведены четыре типа испытаний: базовая нагрузка, стрессовая нагрузка, пиковая нагрузка и длительная нагрузка. Критериями успешности являлись доля ошибочных HTTP-запросов, перцентили времени ответа p95/p99 и стабильность работы сервисов в течение всего теста.

## Важные замечания

- Не запускайте `stress` и `spike` на рабочей базе с реальными пользователями.
- Скрипт создаёт тестовых пользователей с email вида `k6-<run>-<number>@load.local`.
- Для повторяемых запусков можно задать `RUN_ID` вручную:

```powershell
k6 run -e PROFILE=load -e RUN_ID=diploma-01 load-tests/loom-api.js
```

- Если пользователей уже создали и хотите не выполнять регистрацию:

```powershell
k6 run -e PROFILE=load -e RUN_ID=diploma-01 -e SKIP_REGISTER=true load-tests/loom-api.js
```
