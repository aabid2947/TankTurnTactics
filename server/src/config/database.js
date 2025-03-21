// import mongoose from 'mongoose';

// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGODB_URI, {
//       // These options are no longer needed in newer versions of Mongoose
//       // but keeping them for compatibility with older versions
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });

//     console.log(`MongoDB Connected: ${conn.connection.host}`);
    
//     // Add event listeners for connection issues
//     mongoose.connection.on('error', (err) => {
//       console.error(`MongoDB connection error: ${err.message}`);
//     });
    
//     mongoose.connection.on('disconnected', () => {
//       console.warn('MongoDB disconnected. Attempting to reconnect...');
//     });
    
//     mongoose.connection.on('reconnected', () => {
//       console.info('MongoDB reconnected successfully');
//     });
    
//     return conn;
//   } catch (error) {
//     console.error(`Error connecting to MongoDB: ${error.message}`);
//     throw error; // Let the caller handle the error
//   }
// };

// export default connectDB; 