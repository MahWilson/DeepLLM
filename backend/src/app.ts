import speechRoutes from './routes/speechRoutes';
 
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/speech-to-text', speechRoutes); 