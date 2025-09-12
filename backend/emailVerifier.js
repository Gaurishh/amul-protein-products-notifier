import dotenv from 'dotenv';
dotenv.config();
import { MongoClient } from 'mongodb';

// Get the MongoDB connection string from environment variables
const uri = process.env.MONGO_URI;
const dbName = 'amul_protein_products_notifier';
const collectionName = 'users';

// Check if the MONGO_URI is set in the .env file
if (!uri) {
    console.error("Error: MONGO_URI is not set in the environment variables.");
    console.error("Please create a '.env' file and add your MONGO_URI to it.");
    process.exit(1); // Exit the script with an error code
}

// Create a new MongoClient
const client = new MongoClient(uri);

/**
 * Connects to the database, finds users without the 'emailVerified' field,
 * and adds 'emailVerified: true' to their documents.
 */
async function updateUserEntries() {
    try {
        // Connect the client to the server
        await client.connect();
        console.log("Successfully connected to MongoDB!");

        // Select the database and collection
        const database = client.db(dbName);
        const usersCollection = database.collection(collectionName);

        // Create a filter to find documents where 'emailVerified' does NOT exist
        const filter = { emailVerified: { $exists: false } };

        // Create an update document to set 'emailVerified' to true
        const updateDoc = {
            $set: {
                emailVerified: true,
            },
        };

        // Execute the updateMany operation to update all matching documents
        const result = await usersCollection.updateMany(filter, updateDoc);

        // Log the results of the operation
        console.log(`Found ${result.matchedCount} user(s) without the 'emailVerified' field.`);
        console.log(`Successfully updated ${result.modifiedCount} user(s).`);

    } catch (err) {
        // Catch and log any errors that occur
        console.error("An error occurred while updating user entries:", err);
    } finally {
        // Ensure that the client will close when you finish or an error occurs
        await client.close();
        console.log("MongoDB connection closed.");
    }
}

// Run the main function
updateUserEntries();

