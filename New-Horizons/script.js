import { initializeApp } from "firebase/app"
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  increment
} from "firebase/firestore"
const firebaseConfig = {
  apiKey: "AIzaSyB-iSU9AWR7DY7l7CfIg7aqzGdoINg-Izg",
  authDomain: "pjhq-nh.firebaseapp.com",
  projectId: "pjhq-nh",
  storageBucket: "pjhq-nh.firebasestorage.app",
  messagingSenderId: "236304632775",
  appId: "1:236304632775:web:04230017481d6e7de2e7e2",
  measurementId: "G-MH4WTV0TTE"
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const counterRef = doc(db, "counters", "count")
const counterDisplay = document.getElementById("counter")
const incrementButton = document.getElementById("increment")
async function updateCounter() {
  try {
    const docSnap = await getDoc(counterRef)
    if (docSnap.exists()) {
      let currentValue = docSnap.data().value
      counterDisplay.textContent = currentValue.toString()
    } else {
      // Handle case where document doesn't exist (shouldn't happen if you initialized it)
      console.error("Counter document not found!")
    }
  } catch (error) {
    console.error("Error fetching counter:", error)
  }
}
async function incrementCounter() {
  try {
    await updateDoc(counterRef, {
      value: increment(1)
    })
    updateCounter() //refresh the display
  } catch (error) {
    console.error("Error incrementing counter:", error)
  }
}
incrementButton.addEventListener("click", incrementCounter)
updateCounter() //initial display
