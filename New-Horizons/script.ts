const firebaseConfig = {
    apiKey: "AIzaSyB-iSU9AWR7DY7l7CfIg7aqzGdoINg-Izg",
    authDomain: "pjhq-nh.firebaseapp.com",
    projectId: "pjhq-nh",
    storageBucket: "pjhq-nh.firebasestorage.app",
    messagingSenderId: "236304632775",
    appId: "1:236304632775:web:04230017481d6e7de2e7e2",
    measurementId: "G-MH4WTV0TTE"
  }

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const counterRef = db.collection("counters").doc("count");


const counterDisplay = document.getElementById("counter");
const incrementButton = document.getElementById("increment");

async function updateCounter() {
    try {
        const docSnap = await db.doc("counters/count").get();
        if (docSnap.data()) { 
            let currentValue = docSnap.data().value;
            counterDisplay.textContent = currentValue.toString();
        } else {
            console.error("Counter document not found!");
        }
    } catch (error) {
        console.error("Error fetching counter:", error);
    }
}


async function incrementCounter() {
    try {
        await db.collection("counters").doc("count").update({
            value: firebase.firestore.FieldValue.increment(1)
        });
        updateCounter();
    } catch (error) {
        console.error("Error incrementing counter:", error);
    }
}

incrementButton.addEventListener("click", incrementCounter);

counterRef.onSnapshot((doc) => {
    if (doc.exists) {
        let currentValue = doc.data().value;
        counterDisplay.textContent = currentValue.toString();
    } else {
        console.error("Counter document not found!");
    }
});

updateCounter();
