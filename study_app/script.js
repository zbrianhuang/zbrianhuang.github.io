// Get DOM elements
document.addEventListener("DOMContentLoaded", function() {
  // Your JavaScript code here

const timerDisplay = document.getElementById("timer_display");
const initStartButton = document.getElementById("fake_start_button");
const startButton = document.getElementById("real_start_button");
const initialView = document.getElementById("inital_view");
const timerView = document.getElementById("timer_view");
const workValue = document.getElementById("work_time");
const breakValue = document.getElementById("break_time");
const repsValue = document.getElementById("reps");
const repsDisplay = document.getElementById("reps_display");
const ratioDisplay = document.getElementById("ratio");
const returnButton = document.getElementById("return_button");
const currentMode = document.getElementById("current_mode");
const total_time_worked_display = document.getElementById("total_time_display");
const hide = document.getElementById("hide");
const bellsound = document.getElementById("bell");
// Timer variables
let workTime = 25*60; // 25 minutes in seconds
let breakTime = 5*60; // 5 minutes in seconds

let reps = 4; // Number of repetitions
let totalReps = reps;
let currentTimer = "work"; // Indicates if it's work or break time
let timerInterval;
let remainingTime = workTime;
let done = false;


// Update the timer display
function updateTimerDisplay() {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

let timerID;
let startTime;
let elapsedTime = 0;
let isRunning = false;

function toggleTimer() {
  repsDisplay.textContent = "Reps Remaining: " + reps;

  if (isRunning) {
    cancelAnimationFrame(timerID);
    isRunning = false;
    startButton.textContent = "Start";
  } else {
    startTime = performance.now() - elapsedTime;
    isRunning = true;
    requestAnimationFrame(updateTimer);
    startButton.textContent = "Pause";
  }
}

function updateTimer(timestamp) {
  elapsedTime = timestamp - startTime;
  // You can update your display here with the elapsed time or any other logic.

  if (isRunning) {
    timerID = requestAnimationFrame(updateTimer);
  }
}
nc function playBellNTimes(n) {
  for (let i = 0; i < n; i++) {
    await playBell(); // Play the audio
  }
}

async function playBell() {
  return new Promise((resolve, reject) => {
    bellsound.onended = () => {
      resolve();
    };

    bellsound.play();
  });
}
// Update the timer every second
function updateTimer() {
  
  remainingTime--;
  updateTimerDisplay();

  if (remainingTime === 0||remainingTime < 0) {
    playBellNTimes(2);
    if (currentTimer === "work") {
      
      reps--;
      repsDisplay.textContent = "Reps Remaining: "+reps;
      if (reps === 0) {
        currentTimer = "done";
        timerDisplay.textContent = "Done :D";
        currentMode.textContent="";
        repsDisplay.style.display="none";

        toggleTimer();
      
        done = true;
        startButton.textContent = "";
        
        return;
      } else {
        currentMode.textContent = "BREAK";
        
        currentTimer = "break";
        remainingTime = breakTime;
      }
    } else if (currentTimer === "break") {
      currentMode.textContent = "WORK";
     
      currentTimer = "work";
      remainingTime = workTime;
    }
  }
}
function formatTime(input) {
  let minutes = Math.floor(input / 60);
  let seconds = input % 60;
  let formattedSeconds = seconds.toString().padStart(2, '0');
  let formattedMinutes = minutes.toString().padStart(2,'0');
  let output = `${formattedMinutes}:${formattedSeconds}`;
  return output;
}

function updateRatio() {
  // Get the valuesfrom the textboxes
  
  let ratioNum = 0;
  
    ratioNum = workTime/(workTime+breakTime);
  
  if((workTime===0&&breakTime!=0)||workTime!=0){
  ratioDisplay.textContent = Math.floor(ratioNum*100)+"%";
  
  ratioDisplay.style.color = getRatioColor(ratioNum);
  }else{
    ratioDisplay.style.color  = "rgb(255,0,0,1)";
  }
  
  // Update the content in the output div
}



function getRatioColor(ratioNum){
  let returnStr = "";
  let red = 0,green =0;
  if(ratioNum === 0){
    red = 255;
  }
  if(ratioNum<0.50&&ratioNum>0){
    red = 255;
    green=(255*ratioNum*2);
  }
  if(ratioNum>=0.5){
    green =255;
    red=255-(255*ratioNum/2);
  }
  returnStr +="rgb("+red+","+green+",0,1)";
  
  return returnStr;

}
function gradientBackground() {
  let totalTimeElapsed=0;

  const totalTime = Math.floor((parseFloat(workTime) * parseFloat(reps) + parseFloat(breakTime) * (parseFloat(reps) + 1)) * 100);

  console.log(totalTime);
  let red = 0;
  let green = 0;
  let blue = 0;
  let red2 = 0;
  let green2 = 0;
  let blue3 = 0;
  let step = 1;

  function goUp(percentComplete,stage){
    return Math.floor(255*(percentComplete-(stage-0.2))/0.2);
  }
  function goDown(percentComplete,stage){
    return Math.floor(255-(255*(percentComplete-(stage-0.2))/0.2))
  }
  const MAX = 255;
  function updateBackground() {
    // Increment totalTimeElapsed by one millisecond
    totalTimeElapsed += 1;

    // Calculate percentComplete
    const percentComplete = totalTimeElapsed / totalTime;
    
    

    // Update RGB values based on percentComplete
    if(percentComplete<0.2){
      red = MAX;
      green = goUp(percentComplete,0.2);
      blue = 0;
      red2 = goDown(percentComplete,0.2);
      green2 = MAX;
      blue2 = 0;
    }else if(percentComplete<0.4){
      
      red = goDown(percentComplete,0.4);
      green = MAX;
      blue= 0;
      red2 =0;
      green2 = MAX;
      blue2 = goUp(percentComplete,0.4);

    }else if(percentComplete<0.6){
      red = 0;
      green = MAX;
      blue= goUp(percentComplete,0.6);
      red2 = 0;
      green2 = goDown(percentComplete,0.6);
      blue2 = MAX;
    }else if (percentComplete<0.8){
      red = 0;
      green = goDown(percentComplete,0.8);
      blue = MAX;
      red2 = goUp(percentComplete,0.8);
      green2 = 0;
      blue2 = MAX;
    }else if(percentComplete<1){
      red = goUp(percentComplete,1);
      green = goUp(percentComplete,1);
      blue = MAX;
      red2 = MAX;
      green2 = goUp(percentComplete,1);
      blue2 = MAX;
    }
    // Limit the RGB values to stay within the 0-255 range
    red = Math.min(255, red);
    green = Math.min(255, green);
    blue = Math.min(255, blue);

    // Construct the RGB color strings for color1 and color2
    const color2 = `rgb(${red},${green},${blue},0.5)`;
    const color1 = `rgb(${red2},${green2},${blue2},0.5)`;

    // Set the background color with the dynamic RGB values for a linear gradient
    document.body.style.background = `linear-gradient(to right, ${color1}, ${color2})`;

    if (percentComplete < 1) {
      setTimeout(updateBackground, 10); // Update every millisecond if the animation is not complete
    } else {
      // Animation complete, do any necessary clean-up here
    }
  }

  // Start the animation by calling the updateBackground function
  updateBackground();
}










function returnToMainScreen(){
  initialView.style.display = "block";
  timerView.style.display = "none";
}
function goToTimerScreen(){
  hide.style.display = "none";
  initialView.style.display = "none";
  timerView.style.display = "block";
  currentMode.textContent = currentTimer.toUpperCase();
  remainingTime = workTime;
}
repsValue.addEventListener("input",()=>{
  reps = repsValue.value;
  totalReps = reps;
  total_time_worked_display.textContent=Math.round((workTime*totalReps)/60)+" minutes";
  repsDisplay.textContent = "Reps Remaining: "+repsValue.value;
});
workValue.addEventListener("input",()=>{
  remainingTime = workTime;
  workTime = workValue.value*60;
  total_time_worked_display.textContent=Math.round((workTime*totalReps)/60)+" minutes";
  if(currentTimer=="work"){
    timerDisplay.textContent = formatTime(workTime);
  }else{
    timerDisplay.textContent = formatTime(breakTime);
  }
  updateRatio();
});
//
breakValue.addEventListener("input",()=>{
  breakTime = breakValue.value*60;
  if(currentTimer=="work"){
    timerDisplay.textContent = formatTime(workTime);
  }else{
    timerDisplay.textContent = formatTime(breakTime);
  }
  updateRatio();
});
initStartButton.addEventListener("click", () =>{
  toggleTimer();
  goToTimerScreen();
  gradientBackground();
});
// Start button click event
startButton.addEventListener("click", () => {
  if(!done){
    toggleTimer();
  }
});

/*
returnButton.addEventListener("click",()=>{
  returnToMainScreen();
});
*/
// Initialize the timer display
updateTimerDisplay();
timerView.style.display = "none";

});
