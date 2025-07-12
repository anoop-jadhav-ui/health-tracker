import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";

const __app_id = import.meta.env.VITE_APP_ID || "default-app-id";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
const __initial_auth_token = import.meta.env.VITE_INITIAL_AUTH_TOKEN || null; // Will sign in anonymously if no token

const encryptText = (text) => {
  if (!text) return "";
  try {
    return btoa(encodeURIComponent(text)); // Use encodeURIComponent for proper handling of UTF-8 characters
  } catch (error) {
    console.error("Encoding failed:", error);
    return "";
  }
};
const decryptText = (encodedText) => {
  if (!encodedText) return "";
  try {
    return decodeURIComponent(atob(encodedText)); // Use decodeURIComponent for proper handling of UTF-8 characters
  } catch (error) {
    console.error("Decoding failed:", error);
    return ""; // Return empty string on decryption failure
  }
};

// --- Firebase Context ---
const FirebaseContext = createContext(null);

const FirebaseProvider = ({ children }) => {
  const [app, setApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        if (
          !firebaseConfig.apiKey ||
          firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY"
        ) {
          throw new Error(
            "Firebase API Key is missing or invalid. Please update __firebase_config with your actual Firebase project details."
          );
        }
        const firebaseApp = initializeApp(firebaseConfig);
        const firebaseAuth = getAuth(firebaseApp);
        const firestoreDb = getFirestore(firebaseApp);
        setApp(firebaseApp);
        setAuth(firebaseAuth);
        setDb(firestoreDb);
        if (__initial_auth_token) {
          await signInWithCustomToken(firebaseAuth, __initial_auth_token);
        } else {
          await signInAnonymously(firebaseAuth);
        }
        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            setUserId(null);
            signInAnonymously(firebaseAuth).catch((e) =>
              console.error("Error signing in anonymously:", e)
            );
          }
          setIsAuthReady(true);
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (e) {
        setError(
          `Failed to initialize app: ${e.message}. Please ensure your Firebase config is correct and Firebase Authentication is enabled.`
        );
        setLoading(false);
      }
    };
    initializeFirebase();
  }, []);

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError("Firebase Auth not initialized.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setLoading(false);
    } catch (error) {
      setError(`Google Sign-In failed: ${error.message}`);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) {
      setError("Firebase Auth not initialized.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setLoading(false);
    } catch (error) {
      setError(`Sign out failed: ${error.message}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#f3f4f6",
        }}
      >
        <div
          style={{
            border: "4px solid #22c55e",
            borderTop: "4px solid #e5e7eb",
            borderRadius: "50%",
            width: 64,
            height: 64,
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ marginTop: 16, fontSize: 18, color: "#374151" }}>
          Initializing App...
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#fee2e2",
          padding: 20,
        }}
      >
        <p style={{ color: "#991b1b", fontSize: 18, textAlign: "center" }}>
          {error}
        </p>
        <button
          onClick={() => setError(null)}
          style={{
            marginTop: 16,
            background: "#ef4444",
            color: "#fff",
            fontWeight: "bold",
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider
      value={{
        app,
        db,
        auth,
        userId,
        isAuthReady,
        handleGoogleSignIn,
        handleSignOut,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

// --- Firebase Service Utilities ---
const firebaseService = {
  addFoodEntry: async (db, userId, foodData) => {
    if (!db || !userId) {
      console.error("Firestore DB or User ID not available.");
      return;
    }
    try {
      await addDoc(
        collection(db, `artifacts/${__app_id}/users/${userId}/foodEntries`),
        {
          ...foodData,
          timestamp: serverTimestamp(),
        }
      );
      console.log("Food entry added successfully!");
    } catch (e) {
      console.error("Error adding food entry:", e);
      throw e;
    }
  },
  addSymptomEntry: async (db, userId, symptomData) => {
    if (!db || !userId) {
      console.error("Firestore DB or User ID not available.");
      return;
    }
    try {
      const encryptedNotes = encryptText(symptomData.notes || "");
      await addDoc(
        collection(db, `artifacts/${__app_id}/users/${userId}/symptomEntries`),
        {
          ...symptomData,
          notes: encryptedNotes,
          timestamp: serverTimestamp(),
        }
      );
      console.log("Symptom entry added successfully!");
    } catch (e) {
      console.error("Error adding symptom entry:", e);
      throw e;
    }
  },
  getFoodEntries: (db, userId, callback) => {
    if (!db || !userId) {
      console.error(
        "Firestore DB or User ID not available for fetching food entries."
      );
      return () => {};
    }
    const q = query(
      collection(db, `artifacts/${__app_id}/users/${userId}/foodEntries`)
    );
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }));
      callback(entries);
    });
  },
  getSymptomEntries: (db, userId, callback) => {
    if (!db || !userId) {
      console.error(
        "Firestore DB or User ID not available for fetching symptom entries."
      );
      return () => {};
    }
    const q = query(
      collection(db, `artifacts/${__app_id}/users/${userId}/symptomEntries`)
    );
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        notes: decryptText(doc.data().notes || ""),
      }));
      callback(entries);
    });
  },
};

// --- Rule Engine for Correlation Logic ---
/**
 * Defines the rules for identifying potential food triggers.
 * @typedef {object} Rule
 * @property {string} id - Unique ID for the rule.
 * @property {string} triggerFoodCategory - The food category that might cause a symptom.
 * @property {string} associatedSymptom - The symptom associated with the food category.
 * @property {number} cooccurrenceWindowHours - Time window in hours after food consumption for symptom to be considered related.
 * @property {number} minIncidentsForAnalysis - Minimum number of food instances to perform analysis.
 * @property {number} cooccurrenceThreshold - Percentage threshold for co-occurrence to flag as a trigger (e.g., 0.70 for 70%).
 * @property {string} flagMessage - Message to display if the rule is triggered.
 */

/**
 * Array of known trigger rules based on the project plan.
 * @type {Rule[]}
 */
const KNOWN_TRIGGERS = [
  {
    id: "R001",
    triggerFoodCategory: "Dairy",
    associatedSymptom: "Bloating",
    cooccurrenceWindowHours: 6,
    minIncidentsForAnalysis: 5,
    cooccurrenceThreshold: 0.7,
    flagMessage: "Possible Lactose Sensitivity (Bloating)",
  },
  {
    id: "R002",
    triggerFoodCategory: "Dairy",
    associatedSymptom: "Gas",
    cooccurrenceWindowHours: 6,
    minIncidentsForAnalysis: 5,
    cooccurrenceThreshold: 0.7,
    flagMessage: "Possible Lactose Sensitivity (Gas)",
  },
  {
    id: "R003",
    triggerFoodCategory: "Gluten",
    associatedSymptom: "Abdominal Pain",
    cooccurrenceWindowHours: 12,
    minIncidentsForAnalysis: 7,
    cooccurrenceThreshold: 0.6,
    flagMessage: "Potential Gluten Trigger (Abdominal Pain)",
  },
  {
    id: "R004",
    triggerFoodCategory: "Spicy Foods",
    associatedSymptom: "Heartburn",
    cooccurrenceWindowHours: 4,
    minIncidentsForAnalysis: 5,
    cooccurrenceThreshold: 0.75,
    flagMessage: "Possible Spicy Food Sensitivity (Heartburn)",
  },
  {
    id: "R005",
    triggerFoodCategory: "High-FODMAP",
    associatedSymptom: "Bloating",
    cooccurrenceWindowHours: 8,
    minIncidentsForAnalysis: 10,
    cooccurrenceThreshold: 0.65,
    flagMessage: "Potential FODMAP Trigger (Bloating)",
  },
];

/**
 * Analyzes food and symptom entries to identify potential correlations based on predefined rules.
 * @param {Array<object>} allFoodEntries - List of all logged food entries.
 * @param {Array<object>} allSymptomEntries - List of all logged symptom entries.
 * @returns {Array<object>} A list of flagged issues/potential triggers.
 */
const analyzeFoodSymptomCorrelations = (allFoodEntries, allSymptomEntries) => {
  const flaggedIssues = [];

  KNOWN_TRIGGERS.forEach((rule) => {
    const {
      triggerFoodCategory,
      associatedSymptom,
      cooccurrenceWindowHours,
      minIncidentsForAnalysis,
      cooccurrenceThreshold,
      flagMessage,
    } = rule;

    // Filter relevant food and symptom entries for the specific category/type
    const relevantFoodEntries = allFoodEntries.filter(
      (entry) => entry.foodCategory === triggerFoodCategory
    );
    const relevantSymptomEntries = allSymptomEntries.filter(
      (entry) => entry.symptomType === associatedSymptom
    );

    if (relevantFoodEntries.length >= minIncidentsForAnalysis) {
      let foodInstancesWithSymptoms = 0;
      let coOccurringFoodInstances = 0;

      relevantFoodEntries.forEach((foodEntry) => {
        if (!foodEntry.timestamp) return; // Skip if timestamp is missing

        const coOccurrenceWindowEnd = new Date(
          foodEntry.timestamp.getTime() +
            cooccurrenceWindowHours * 60 * 60 * 1000
        );

        const symptomsWithinWindow = relevantSymptomEntries.filter(
          (symptomEntry) => {
            if (!symptomEntry.timestamp) return false; // Skip if timestamp is missing
            return (
              symptomEntry.timestamp > foodEntry.timestamp &&
              symptomEntry.timestamp <= coOccurrenceWindowEnd
            );
          }
        );

        if (symptomsWithinWindow.length > 0) {
          foodInstancesWithSymptoms++;
        }
        coOccurringFoodInstances++; // Count every instance of relevant food
      });

      if (coOccurringFoodInstances > 0) {
        const cooccurrencePercentage =
          foodInstancesWithSymptoms / coOccurringFoodInstances;
        if (cooccurrencePercentage >= cooccurrenceThreshold) {
          flaggedIssues.push({
            foodCategory: triggerFoodCategory,
            symptomType: associatedSymptom,
            correlationStrength: cooccurrencePercentage,
            message: flagMessage,
            details: `Occurred in ${foodInstancesWithSymptoms} out of ${coOccurringFoodInstances} instances of ${triggerFoodCategory} consumption.`,
          });
        }
      }
    }
  });

  return flaggedIssues;
};

// --- UI Components ---
/**
 * Card component to display a single food entry.
 * @param {object} food - Food entry object.
 */
const FoodEntryCard = ({ food }) => (
  <div
    style={{
      background: "#f0fdf4",
      padding: 16,
      borderRadius: 12,
      boxShadow: "0 2px 8px #0001",
      marginBottom: 12,
    }}
  >
    <p style={{ fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
      {food.foodItemName}
    </p>
    <p style={{ fontSize: 14, color: "#4b5563" }}>
      {food.mealType} - {food.portionSize}
    </p>
    <p style={{ fontSize: 14, color: "#4b5563" }}>
      Logged: {food.timestamp ? food.timestamp.toLocaleString() : "N/A"}
    </p>
    {food.notes ? (
      <p style={{ fontSize: 14, color: "#4b5563" }}>Notes: {food.notes}</p>
    ) : null}
  </div>
);

/**
 * Card component to display a single symptom entry.
 * @param {object} symptom - Symptom entry object.
 */
const SymptomEntryCard = ({ symptom }) => (
  <div
    style={{
      background: "#fff7ed",
      padding: 16,
      borderRadius: 12,
      boxShadow: "0 2px 8px #0001",
      marginBottom: 12,
      borderLeft: "4px solid #fdba74",
    }}
  >
    <p style={{ fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
      {symptom.symptomType}
    </p>
    <p style={{ fontSize: 14, color: "#4b5563" }}>
      Severity: {symptom.severity}
    </p>
    <p style={{ fontSize: 14, color: "#4b5563" }}>
      Logged: {symptom.timestamp ? symptom.timestamp.toLocaleString() : "N/A"}
    </p>
    {symptom.notes ? (
      <p style={{ fontSize: 14, color: "#4b5563" }}>Notes: {symptom.notes}</p>
    ) : null}
  </div>
);

/**
 * Component to display a possible trigger identified by the rule engine.
 * @param {object} trigger - Trigger object.
 */
const TriggerDisplay = ({ trigger }) => (
  <div
    style={{
      background: "#fee2e2",
      padding: 16,
      borderRadius: 12,
      boxShadow: "0 2px 8px #0001",
      marginBottom: 12,
      borderLeft: "4px solid #ef4444",
    }}
  >
    <p
      style={{
        fontSize: 18,
        fontWeight: 700,
        color: "#991b1b",
        marginBottom: 8,
      }}
    >
      Possible Trigger Found!
    </p>
    <p style={{ fontSize: 14, color: "#374151" }}>
      <span style={{ fontWeight: 700 }}>Food:</span> {trigger.foodCategory}
    </p>
    <p style={{ fontSize: 14, color: "#374151" }}>
      <span style={{ fontWeight: 700 }}>Symptom:</span> {trigger.symptomType}
    </p>
    <p style={{ fontSize: 14, color: "#374151" }}>
      <span style={{ fontWeight: 700 }}>Message:</span> {trigger.message}
    </p>
    <p style={{ fontSize: 12, color: "#4b5563", marginTop: 8 }}>
      {trigger.details}
    </p>
  </div>
);

/**
 * Custom Modal Component
 * @param {object} children - Content of the modal.
 * @param {boolean} isOpen - Controls modal visibility.
 * @param {function} onClose - Callback when modal is closed.
 * @param {string} title - Title of the modal.
 */
const CustomModal = ({ children, isOpen, onClose, title = "Message" }) => {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(75,85,99,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 32,
          borderRadius: 16,
          boxShadow: "0 4px 24px #0002",
          maxWidth: 400,
          width: "100%",
          margin: 16,
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {title}
        </h2>
        <div
          style={{ marginBottom: 24, textAlign: "center", color: "#374151" }}
        >
          {children}
        </div>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: "#22c55e",
            color: "#fff",
            fontWeight: "bold",
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

// --- Screens ---
/**
 * Home Screen: Displays user ID and buttons for logging.
 */
const HomeScreen = ({ navigation }) => {
  const { userId, db, isAuthReady, handleGoogleSignIn, handleSignOut, auth } =
    useContext(FirebaseContext);

  const [foodEntries, setFoodEntries] = useState([]);
  const [symptomEntries, setSymptomEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    let unsubscribeFood;
    let unsubscribeSymptom;

    if (db && userId && isAuthReady) {
      unsubscribeFood = firebaseService.getFoodEntries(db, userId, (data) => {
        setFoodEntries(data);
      });
      unsubscribeSymptom = firebaseService.getSymptomEntries(
        db,
        userId,
        (data) => {
          setSymptomEntries(data);
        }
      );
    }

    return () => {
      if (unsubscribeFood) unsubscribeFood();
      if (unsubscribeSymptom) unsubscribeSymptom();
    };
  }, [db, userId, isAuthReady]);

  const filteredFoodEntries = foodEntries
    .filter((entry) => {
      if (!entry.timestamp) return false;
      const entryDate = new Date(entry.timestamp);
      return (
        entryDate.getFullYear() === selectedDate.getFullYear() &&
        entryDate.getMonth() === selectedDate.getMonth() &&
        entryDate.getDate() === selectedDate.getDate()
      );
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  const filteredSymptomEntries = symptomEntries
    .filter((entry) => {
      if (!entry.timestamp) return false;
      const entryDate = new Date(entry.timestamp);
      return (
        entryDate.getFullYear() === selectedDate.getFullYear() &&
        entryDate.getMonth() === selectedDate.getMonth() &&
        entryDate.getDate() === selectedDate.getDate()
      );
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  const handleDateChange = (event) => {
    const newDate = new Date(event.target.value);
    if (!isNaN(newDate)) {
      // Check if date is valid
      setSelectedDate(newDate);
    }
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 20,
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          textAlign: "center",
          color: "#1f2937",
          marginBottom: 24,
        }}
      >
        Food & Symptom Tracker
      </h1>
      {userId && (
        <p
          style={{
            fontSize: 14,
            color: "#4b5563",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          User ID: {userId}
        </p>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {auth && auth.currentUser && auth.currentUser.isAnonymous ? (
          <button
            style={{
              background: "#2563eb",
              color: "#fff",
              fontWeight: "bold",
              padding: "8px 16px",
              borderRadius: 12,
              boxShadow: "0 2px 8px #0001",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
            }}
            onClick={handleGoogleSignIn}
          >
            Sign in with Google
          </button>
        ) : (
          <button
            style={{
              background: "#dc2626",
              color: "#fff",
              fontWeight: "bold",
              padding: "8px 16px",
              borderRadius: 12,
              boxShadow: "0 2px 8px #0001",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
            }}
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          padding: 16,
          borderRadius: 12,
          boxShadow: "0 2px 8px #0001",
          marginBottom: 24,
        }}
      >
        <label
          htmlFor="datePicker"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
          }}
        >
          Select Date:
        </label>
        <input
          type="date"
          id="datePicker"
          value={selectedDate.toISOString().split("T")[0]}
          onChange={handleDateChange}
          style={{
            padding: 8,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 16,
            width: 200,
          }}
        />
      </div>

      <h2
        style={{
          fontSize: 24,
          fontWeight: 700,
          textAlign: "center",
          color: "#374151",
          margin: "24px 0 16px",
        }}
      >
        Entries for {selectedDate.toLocaleDateString()}
      </h2>

      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 16,
          boxShadow: "0 2px 12px #0001",
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1f2937",
            marginBottom: 16,
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: 8,
          }}
        >
          Food Log
        </h3>
        {filteredFoodEntries.length === 0 ? (
          <p
            style={{
              fontSize: 18,
              color: "#4b5563",
              textAlign: "center",
              padding: 20,
            }}
          >
            No food logged for this day.
          </p>
        ) : (
          filteredFoodEntries.map((food) => (
            <FoodEntryCard key={food.id} food={food} />
          ))
        )}
      </div>

      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 16,
          boxShadow: "0 2px 12px #0001",
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1f2937",
            marginBottom: 16,
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: 8,
          }}
        >
          Symptom Log
        </h3>
        {filteredSymptomEntries.length === 0 ? (
          <p
            style={{
              fontSize: 18,
              color: "#4b5563",
              textAlign: "center",
              padding: 20,
            }}
          >
            No symptoms logged for this day.
          </p>
        ) : (
          filteredSymptomEntries.map((symptom) => (
            <SymptomEntryCard key={symptom.id} symptom={symptom} />
          ))
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
          margin: "32px 0 40px",
        }}
      >
        <button
          style={{
            background: "#22c55e",
            color: "#fff",
            fontWeight: "bold",
            padding: "12px 24px",
            borderRadius: 16,
            boxShadow: "0 2px 8px #0001",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            transition: "transform 0.2s",
            minWidth: 140,
          }}
          onClick={() => navigation.navigate("AddFood")}
        >
          Add Meal
        </button>
        <button
          style={{
            background: "#2563eb",
            color: "#fff",
            fontWeight: "bold",
            padding: "12px 24px",
            borderRadius: 16,
            boxShadow: "0 2px 8px #0001",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            transition: "transform 0.2s",
            minWidth: 140,
          }}
          onClick={() => navigation.navigate("AddSymptom")}
        >
          Add Symptom
        </button>
        <button
          style={{
            background: "#a21caf",
            color: "#fff",
            fontWeight: "bold",
            padding: "12px 24px",
            borderRadius: 16,
            boxShadow: "0 2px 8px #0001",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            transition: "transform 0.2s",
            minWidth: 140,
          }}
          onClick={() => navigation.navigate("Trends")}
        >
          View Trends
        </button>
      </div>
    </div>
  );
};

/**
 * Add Food Screen: Form for logging a new food entry.
 */
const AddFoodScreen = ({ navigation }) => {
  const { db, userId } = useContext(FirebaseContext);
  const [foodItemName, setFoodItemName] = useState("");
  const [mealType, setMealType] = useState("Breakfast");
  const [portionSize, setPortionSize] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTimestamp, setSelectedTimestamp] = useState(new Date());
  const [message, setMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);

  const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];

  const handleAddFood = async () => {
    if (!foodItemName || !portionSize) {
      setMessage("Please fill in food item name and portion size.");
      setIsModalVisible(true);
      return;
    }

    const foodData = {
      foodItemName,
      mealType,
      portionSize: parseFloat(portionSize),
      notes,
      foodCategory: "Uncategorized", // Simplified for now, could be derived from API
      timestamp: selectedTimestamp, // Will be overwritten by serverTimestamp in Firebase
    };

    try {
      await firebaseService.addFoodEntry(db, userId, foodData);
      setMessage("Food entry added successfully!");
      setIsModalVisible(true);
      // Clear form
      setFoodItemName("");
      setPortionSize("");
      setNotes("");
      setSelectedTimestamp(new Date());
    } catch (e) {
      setMessage(`Error adding food entry: ${e.message}`);
      setIsModalVisible(true);
    }
  };

  const onDateTimeChange = (event) => {
    const newDateTime = new Date(event.target.value);
    if (!isNaN(newDateTime)) {
      setSelectedTimestamp(newDateTime);
    }
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 20,
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          textAlign: "center",
          color: "#1f2937",
          marginBottom: 24,
        }}
      >
        Add New Meal
      </h1>
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 16,
          boxShadow: "0 2px 12px #0001",
        }}
      >
        <label
          htmlFor="foodItemName"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            display: "block",
          }}
        >
          Food Item Name:
        </label>
        <input
          type="text"
          id="foodItemName"
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 16,
          }}
          value={foodItemName}
          onChange={(e) => setFoodItemName(e.target.value)}
          placeholder="e.g., Apple, Chicken Salad"
        />
        <label
          htmlFor="mealType"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            display: "block",
          }}
        >
          Meal Type:
        </label>
        <select
          id="mealType"
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 16,
            background: "#fff",
          }}
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
        >
          {mealTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <label
          htmlFor="portionSize"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            display: "block",
          }}
        >
          Portion Size (e.g., 1, 0.5 cup):
        </label>
        <input
          type="text"
          id="portionSize"
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 16,
          }}
          value={portionSize}
          onChange={(e) => setPortionSize(e.target.value)}
          placeholder="e.g., 1, 0.5 cup"
        />
        <label
          htmlFor="notes"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            display: "block",
          }}
        >
          Notes (Optional):
        </label>
        <textarea
          id="notes"
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 16,
            minHeight: 80,
            resize: "vertical",
          }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., with almonds, homemade"
        />
        <label
          htmlFor="timeOfMeal"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            display: "block",
          }}
        >
          Time of Meal:
        </label>
        <input
          type="datetime-local"
          id="timeOfMeal"
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 24,
            background: "#fff",
          }}
          value={formatDateTimeLocal(selectedTimestamp)}
          onChange={onDateTimeChange}
        />
        <button
          style={{
            width: "100%",
            background: "#22c55e",
            color: "#fff",
            fontWeight: "bold",
            padding: "14px 0",
            borderRadius: 12,
            boxShadow: "0 2px 8px #0001",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            marginBottom: 0,
          }}
          onClick={handleAddFood}
        >
          Log Meal
        </button>
      </div>
      <CustomModal
        isOpen={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Notification"
      >
        <p>{message}</p>
      </CustomModal>
      <button
        style={{
          marginTop: 24,
          width: "100%",
          background: "#d1d5db",
          color: "#1f2937",
          fontWeight: "bold",
          padding: "14px 0",
          borderRadius: 12,
          boxShadow: "0 2px 8px #0001",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
        }}
        onClick={() => navigation.goBack()}
      >
        Go Back
      </button>
    </div>
  );
};

/**
 * Add Symptom Screen: Form for logging a new symptom entry.
 */
const AddSymptomScreen = ({ navigation }) => {
  const { db, userId } = useContext(FirebaseContext);
  const [symptomType, setSymptomType] = useState("Bloating");
  const [severity, setSeverity] = useState("Mild");
  const [notes, setNotes] = useState("");
  const [selectedTimestamp, setSelectedTimestamp] = useState(new Date());
  const [message, setMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);

  const symptomTypes = [
    "Bloating",
    "Gas",
    "Stomach Ache",
    "Headache",
    "Nausea",
    "Diarrhea",
    "Constipation",
    "Fatigue",
    "Skin Rash",
    "Other",
  ];
  const severityLevels = ["Mild", "Moderate", "Severe"];

  const handleAddSymptom = async () => {
    if (!symptomType) {
      setMessage("Please select a symptom type.");
      setIsModalVisible(true);
      return;
    }

    const symptomData = {
      symptomType,
      severity,
      notes, // Notes will be encrypted by firebaseService.addSymptomEntry
      timestamp: selectedTimestamp, // Will be overwritten by serverTimestamp in Firebase
    };

    try {
      await firebaseService.addSymptomEntry(db, userId, symptomData);
      setMessage("Symptom entry added successfully!");
      setIsModalVisible(true);
      // Clear form
      setSymptomType("Bloating");
      setSeverity("Mild");
      setNotes("");
      setSelectedTimestamp(new Date());
    } catch (e) {
      setMessage(`Error adding symptom entry: ${e.message}`);
      setIsModalVisible(true);
    }
  };

  const onDateTimeChange = (event) => {
    const newDateTime = new Date(event.target.value);
    if (!isNaN(newDateTime)) {
      setSelectedTimestamp(newDateTime);
    }
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 20,
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          textAlign: "center",
          color: "#1f2937",
          marginBottom: 24,
        }}
      >
        Add New Symptom
      </h1>
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 16,
          boxShadow: "0 2px 12px #0001",
        }}
      >
        <label
          htmlFor="symptomType"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            display: "block",
          }}
        >
          Symptom Type:
        </label>
        <select
          id="symptomType"
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 16,
            background: "#fff",
          }}
          value={symptomType}
          onChange={(e) => setSymptomType(e.target.value)}
        >
          {symptomTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <label
          htmlFor="severity"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            display: "block",
          }}
        >
          Severity:
        </label>
        <select
          id="severity"
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 16,
            background: "#fff",
          }}
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          {severityLevels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <label
          htmlFor="notes"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            display: "block",
          }}
        >
          Notes (Optional, will be encrypted):
        </label>
        <textarea
          id="notes"
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 16,
            minHeight: 80,
            resize: "vertical",
          }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., mild cramping, localized to lower abdomen"
        />
        <label
          htmlFor="timeOfSymptomOnset"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 8,
            display: "block",
          }}
        >
          Time of Symptom Onset:
        </label>
        <input
          type="datetime-local"
          id="timeOfSymptomOnset"
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 24,
            background: "#fff",
          }}
          value={formatDateTimeLocal(selectedTimestamp)}
          onChange={onDateTimeChange}
        />
        <button
          style={{
            width: "100%",
            background: "#2563eb",
            color: "#fff",
            fontWeight: "bold",
            padding: "14px 0",
            borderRadius: 12,
            boxShadow: "0 2px 8px #0001",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            marginBottom: 0,
          }}
          onClick={handleAddSymptom}
        >
          Log Symptom
        </button>
      </div>
      <CustomModal
        isOpen={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Notification"
      >
        <p>{message}</p>
      </CustomModal>
      <button
        style={{
          marginTop: 24,
          width: "100%",
          background: "#d1d5db",
          color: "#1f2937",
          fontWeight: "bold",
          padding: "14px 0",
          borderRadius: 12,
          boxShadow: "0 2px 8px #0001",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
        }}
        onClick={() => navigation.goBack()}
      >
        Go Back
      </button>
    </div>
  );
};

/**
 * Trends Screen: Displays possible food triggers based on logged data.
 */
const TrendsScreen = ({ navigation }) => {
  const { userId, db, isAuthReady } = useContext(FirebaseContext);
  const [foodEntries, setFoodEntries] = useState([]);
  const [symptomEntries, setSymptomEntries] = useState([]);
  const [possibleTriggers, setPossibleTriggers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFood;
    let unsubscribeSymptom;

    if (db && userId && isAuthReady) {
      unsubscribeFood = firebaseService.getFoodEntries(db, userId, (data) => {
        setFoodEntries(data);
        setLoading(false);
      });
      unsubscribeSymptom = firebaseService.getSymptomEntries(
        db,
        userId,
        (data) => {
          setSymptomEntries(data);
          setLoading(false);
        }
      );
    }

    return () => {
      if (unsubscribeFood) unsubscribeFood();
      if (unsubscribeSymptom) unsubscribeSymptom();
    };
  }, [db, userId, isAuthReady]);

  useEffect(() => {
    if (!loading && foodEntries.length > 0 && symptomEntries.length > 0) {
      const triggers = analyzeFoodSymptomCorrelations(
        foodEntries,
        symptomEntries
      );
      setPossibleTriggers(triggers);
    } else if (
      !loading &&
      (foodEntries.length === 0 || symptomEntries.length === 0)
    ) {
      setPossibleTriggers([]); // Clear triggers if no data or not enough data
    }
  }, [foodEntries, symptomEntries, loading]);
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#f3f4f6",
        }}
      >
        <div
          style={{
            border: "4px solid #22c55e",
            borderTop: "4px solid #e5e7eb",
            borderRadius: "50%",
            width: 64,
            height: 64,
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ marginTop: 16, fontSize: 18, color: "#374151" }}>
          Loading data for analysis...
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 20,
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          textAlign: "center",
          color: "#1f2937",
          marginBottom: 24,
        }}
      >
        Trends & Analysis
      </h1>
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 16,
          boxShadow: "0 2px 12px #0001",
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1f2937",
            marginBottom: 16,
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: 8,
          }}
        >
          Possible Triggers
        </h3>
        {possibleTriggers.length === 0 ? (
          <p
            style={{
              fontSize: 18,
              color: "#4b5563",
              textAlign: "center",
              padding: 20,
            }}
          >
            No significant triggers identified yet. Keep logging! (Requires at
            least 5-10 entries per food category/symptom type for analysis)
          </p>
        ) : (
          possibleTriggers.map((trigger, index) => (
            <TriggerDisplay key={index} trigger={trigger} />
          ))
        )}
      </div>
      <button
        style={{
          width: "100%",
          background: "#d1d5db",
          color: "#1f2937",
          fontWeight: "bold",
          padding: "14px 0",
          borderRadius: 12,
          boxShadow: "0 2px 8px #0001",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
        }}
        onClick={() => navigation.goBack()}
      >
        Go Back
      </button>
    </div>
  );
};

// --- Main App Component ---
/**
 * Main application component. Manages navigation between screens.
 */
const App = () => {
  const [currentScreen, setCurrentScreen] = useState("Home");

  const navigate = (screenName) => {
    setCurrentScreen(screenName);
  };

  const navigation = {
    navigate: navigate,
    goBack: () => setCurrentScreen("Home"), // Simple go back to home for this demo
  };

  return (
    <FirebaseProvider>
      <div
        style={{
          minHeight: "100vh",
          background: "#f3f4f6",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {currentScreen === "Home" && <HomeScreen navigation={navigation} />}
        {currentScreen === "AddFood" && (
          <AddFoodScreen navigation={navigation} />
        )}
        {currentScreen === "AddSymptom" && (
          <AddSymptomScreen navigation={navigation} />
        )}
        {currentScreen === "Trends" && <TrendsScreen navigation={navigation} />}
      </div>
    </FirebaseProvider>
  );
};

export default App;
