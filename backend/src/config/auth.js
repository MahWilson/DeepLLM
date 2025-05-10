const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.warn('JWT_SECRET not found in environment variables, using default secret');
        return 'default-secret-key-for-development';
    }
    return secret;
};

module.exports = {
    getJwtSecret,
    jwtOptions: {
        expiresIn: '24h'
    }
}; 