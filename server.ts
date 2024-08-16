import app from "./src/app";
import connectDB from "./src/config/db";

const startServer = async () => {
  // Connect database
  await connectDB();

  const port = process.env.PORT || 4000;

  app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
  });
};

startServer();

