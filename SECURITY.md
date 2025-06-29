# Security

## Reporting Security Issues

If you discover a security vulnerability within this project, please send an email to [your-email@example.com]. All security vulnerabilities will be promptly addressed.

## Security Practices

### Environment Variables

This project uses environment variables for all sensitive configuration. Never commit `.env` files to version control.

### Required Environment Variables

- `EMAIL_USER`: Email address for sending notifications
- `EMAIL_PASSWORD`: App password for email authentication
- `MONGO_URI`: MongoDB connection string
- `BACKEND_API_BASE`: Backend API URL

### Email Security

- Use App Passwords for Gmail (not regular passwords)
- Enable 2-factor authentication on email accounts
- Use dedicated email accounts for notifications

### Database Security

- Use strong MongoDB passwords
- Restrict database access to application servers only
- Use connection strings with authentication

### API Security

- Backend API should be deployed with HTTPS in production
- Implement rate limiting for API endpoints
- Use CORS properly to restrict frontend access

## Deployment Security Checklist

- [ ] Environment variables are properly set
- [ ] Database has strong authentication
- [ ] API is served over HTTPS
- [ ] Email credentials are secure
- [ ] No sensitive data in logs
- [ ] Proper firewall rules
- [ ] Regular security updates

## Dependencies

This project uses the following security-focused practices:

- Regular dependency updates
- No hardcoded secrets
- Input validation on API endpoints
- Proper error handling without information disclosure
