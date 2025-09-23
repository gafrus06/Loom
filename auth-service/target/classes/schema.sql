INSERT INTO user_roles(user_id, role_id)
VALUES (
           (SELECT id FROM users WHERE email='admin1@example.com'),
           (SELECT id FROM roles WHERE name='ROLE_ADMIN')
       );