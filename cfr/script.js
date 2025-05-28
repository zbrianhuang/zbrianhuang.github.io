document.addEventListener('DOMContentLoaded', () => {
    const RANKS = ['0', '1', '2', '3']; // 0, 1, 2, 3
    const SUITS = ['r', 'b','c']; 
    const BET_SIZE = 1;
    const ANTE = 1;
    const INITIAL_CHIPS = 20;

    let deck = [];
    let playerHand = null;
    let botHand = null;
    let communityCard = null;

    let playerChips = INITIAL_CHIPS;
    let botChips = INITIAL_CHIPS;
    let pot = 0;

    let currentBettingRound = 0; // 0 for pre-flop, 1 for post-flop
    let playerToAct = 'player'; // 'player' or 'bot'
    let currentBet = 0; // Current bet amount in this round that needs to be called
    let handActionHistory = ""; // e.g., "pbp" (player bets, bot calls, player checks)
    let botWeights = {};
    let gameInProgress = false;
    let lastFirstPlayer = 'bot'; // Track the last player to act first
    let actionSequence = ''; // Will store just the sequence like 'pbb'

    // DOM Elements
    const playerHandDiv = document.getElementById('player-hand');
    const botHandDiv = document.getElementById('bot-hand');
    const communityCardDiv = document.getElementById('community-card');
    const potAmountSpan = document.getElementById('pot-amount');
    const playerChipsSpan = document.getElementById('player-chips');
    const botChipsSpan = document.getElementById('bot-chips');
    const gameMessageDiv = document.getElementById('game-message');
    const playerActionsDiv = document.getElementById('player-actions');
    const startGameBtn = document.getElementById('start-game-btn');
    const newHandBtn = document.getElementById('new-hand-btn');
    const botWeightsInput = document.getElementById('bot-weights-input');
    const loadWeightsBtn = document.getElementById('load-weights-btn');
    const playerStrengthDiv = document.getElementById('player-strength');
    const botStrengthDiv = document.getElementById('bot-strength');
    const actionHistoryLogDiv = document.getElementById('action-history-log');

    function createDeck() {
        deck = [];
        for (let r = 0; r < RANKS.length; r++) {
            for (let s = 0; s < SUITS.length; s++) {
                deck.push({ rank: r, suit: s, id: `${RANKS[r]}${SUITS[s]}` });
            }
        }
    }

    function shuffleDeck() {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    function dealCards() {
        playerHand = deck.pop();
        botHand = deck.pop();
        communityCard = deck.pop();
    }

    function displayCard(card, element, isHidden = false) {
        element.innerHTML = ''; // Clear previous
        if (!card) return;

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (isHidden) cardDiv.classList.add('hidden');

        const rankSpan = document.createElement('span');
        rankSpan.classList.add('rank');
        rankSpan.textContent = isHidden ? '?' : RANKS[card.rank];
        
        const suitSpan = document.createElement('span');
        suitSpan.classList.add('suit');
        suitSpan.classList.add(`suit-${card.suit}`);
        suitSpan.innerHTML = isHidden ? '?' : SUITS[card.suit];

        cardDiv.appendChild(rankSpan);
        cardDiv.appendChild(suitSpan);
        element.appendChild(cardDiv);
    }
    
    function updateUI() {
        displayCard(playerHand, playerHandDiv);
        displayCard(botHand, botHandDiv, currentBettingRound < 2 && !isHandOver()); // Hide bot card until showdown
        displayCard(communityCard, communityCardDiv, currentBettingRound < 1); // Hide community until round 2

        potAmountSpan.textContent = pot;
        playerChipsSpan.textContent = `(${playerChips})`;
        botChipsSpan.textContent = `(${botChips})`;

        updateActionButtons();
        updateHandStrengths();
        updateActionHistoryLog();
    }

    function updateActionHistoryLog() {
        actionHistoryLogDiv.textContent = actionSequence;
    }
    
    function logAction(actor, action, amount = "") {
        const message = `${actor} ${action} ${amount}`;
        gameMessageDiv.textContent = message;
        
        // Only track player/bot actions in the sequence
        if (actor === "Player" || actor === "Bot") {
            // 'p' for pass/check, 'b' for bet/call
            if (action === "checks" || action === "pass") {
                actionSequence += 'p';
            } else if (action === "bets" || action === "calls") {
                actionSequence += 'b';
            }
            console.log("Adding to sequence:", actionSequence[actionSequence.length - 1], "for action:", action);
        }
        
        // Update the display
        actionHistoryLogDiv.textContent = actionSequence;
        
        console.log("Current action:", message);
        console.log("Action sequence:", actionSequence);
    }


    function getHandStrength(holeCard, community) {
        if (!holeCard) return { type: 'No Card', rankValue: -1, kickerValue: -1, text: "" };
        if (!community || currentBettingRound < 1) { // Pre-flop or community not revealed
            return { type: 'High Card', rankValue: holeCard.rank, kickerValue: -1, text: `${RANKS[holeCard.rank]} High` };
        }

        if (holeCard.rank === community.rank) {
            return { type: 'Pair', rankValue: holeCard.rank, kickerValue: -1, text: `Pair of ${RANKS[holeCard.rank]}s` };
        } else {
            const highRank = Math.max(holeCard.rank, community.rank);
            const kickerRank = Math.min(holeCard.rank, community.rank);
            return { type: 'High Card', rankValue: highRank, kickerValue: kickerRank, text: `${RANKS[highRank]} High, ${RANKS[kickerRank]} Kicker` };
        }
    }

    function updateHandStrengths() {
        const playerStrength = getHandStrength(playerHand, communityCard);
        playerStrengthDiv.textContent = playerStrength.text;

        if (isHandOver() || currentBettingRound >= 2) { // Show bot strength at showdown or if game ends early
            const botStrength = getHandStrength(botHand, communityCard);
            botStrengthDiv.textContent = botStrength.text;
        } else {
            botStrengthDiv.textContent = "";
        }
    }
    
    function compareHands(playerStr, botStr) {
        if (playerStr.type === 'Pair' && botStr.type !== 'Pair') return 'player';
        if (botStr.type === 'Pair' && playerStr.type !== 'Pair') return 'bot';

        if (playerStr.rankValue > botStr.rankValue) return 'player';
        if (botStr.rankValue > playerStr.rankValue) return 'bot';

        // Same rank, check kicker (only for High Card vs High Card)
        if (playerStr.type === 'High Card' && botStr.type === 'High Card') {
            if (playerStr.kickerValue > botStr.kickerValue) return 'player';
            if (botStr.kickerValue > playerStr.kickerValue) return 'bot';
        }
        return 'tie'; // Exact same hand
    }

    function updateActionButtons() {
        playerActionsDiv.innerHTML = ''; // Clear old buttons
        if (!gameInProgress || playerToAct !== 'player' || isHandOver()) return;

        if (currentBet === 0) { // No bet to player
            const checkBtn = document.createElement('button');
            checkBtn.textContent = 'Check';
            checkBtn.onclick = () => handlePlayerAction('check');
            playerActionsDiv.appendChild(checkBtn);

            const betBtn = document.createElement('button');
            betBtn.textContent = `Bet ${BET_SIZE}`;
            betBtn.onclick = () => handlePlayerAction('bet');
            if (playerChips < BET_SIZE) betBtn.disabled = true;
            playerActionsDiv.appendChild(betBtn);
        } else { // Opponent (bot) has bet
            const foldBtn = document.createElement('button');
            foldBtn.textContent = 'Fold';
            foldBtn.onclick = () => handlePlayerAction('fold');
            playerActionsDiv.appendChild(foldBtn);

            const callBtn = document.createElement('button');
            callBtn.textContent = `Call ${currentBet}`;
            callBtn.onclick = () => handlePlayerAction('call');
            if (playerChips < currentBet) callBtn.disabled = true; // Should not happen with fixed bet if ante paid
            playerActionsDiv.appendChild(callBtn);
        }
    }
    function handlePlayerAction(action) {
        if (playerToAct !== 'player' || !gameInProgress) return;
        
        let playerBetAmount = 0;
        // actionChar is no longer needed here as logAction builds the history key part

        if (action === 'check') {
            logAction("Player", "checks");
            // currentBet remains 0
            playerToAct = 'bot';
            updateUI(); // Update UI before bot acts
            setTimeout(handleBotAction, 1000);
        } else if (action === 'bet') {
            playerBetAmount = BET_SIZE;
            playerChips -= playerBetAmount;
            pot += playerBetAmount;
            currentBet = playerBetAmount; // Player made the current bet
            logAction("Player", "bets", playerBetAmount);
            
            playerToAct = 'bot';
            updateUI(); // Update UI before bot acts
            setTimeout(handleBotAction, 1000);
        } else if (action === 'call') {
            playerBetAmount = currentBet; // Call the bot's bet
            playerChips -= playerBetAmount;
            pot += playerBetAmount;
            logAction("Player", "calls", playerBetAmount);
            
            // Player called bot's bet. Round of betting is over.
            proceedToNextStage(); 
        } else if (action === 'fold') {
            logAction("Player", "folds");
            endHand('bot'); 
            return; // Hand is over
        }
        // updateUI(); // Called in specific paths or by proceedToNextStage/bot action sequence
    }

    function handleBotAction() {
        if (playerToAct !== 'bot' || !gameInProgress) return;

        let botActionString; // This will store 'check', 'bet', 'call', or 'fold'
        const decisionKey = getBotDecisionKey();
        // Fallback key for pre-flop if specific rank isn't found (e.g. "2 ? p")
        const wildcardKeyRank = `${currentBettingRound === 0 ? '2' : '3'} ? ${decisionKey.split(' ')[2]}`; 
        
        let weights;
        if (botWeights[decisionKey]) {
            weights = botWeights[decisionKey];
            console.log(`Bot using key: ${decisionKey}, weights: ${weights}`);
        } else if (botWeights[wildcardKeyRank] && currentBettingRound === 0) { // Only use wildcard for pre-flop rank
            weights = botWeights[wildcardKeyRank];
            console.log(`Bot using wildcard rank key: ${wildcardKeyRank}, weights: ${weights}`);
        } else {
            console.log(`Bot key not found: ${decisionKey} (or wildcard ${wildcardKeyRank}). Using default 50/50 strategy.`);
            weights = [0.5, 0.5]; // [fold/check_prob, bet/call_prob]
        }

        const randomChoice = Math.random();
        console.log(`Random choice: ${randomChoice}, Weights: ${weights}`);

        if (currentBet === 0) { // Player checked or bot is first to act in a new sequence
            // weights[0] is check_prob, weights[1] is bet_prob
            if (randomChoice < parseFloat(weights[0])) { 
                botActionString = 'check';
                logAction("Bot", "checks");
            } else { 
                botActionString = 'bet';
                if (botChips >= BET_SIZE) {
                    botChips -= BET_SIZE;
                    pot += BET_SIZE;
                    currentBet = BET_SIZE; // Bot made the current bet
                    logAction("Bot", "bets", BET_SIZE);
                } else { 
                    botActionString = 'check'; // Can't bet, so must check
                    logAction("Bot", "checks (not enough to bet)");
                }
            }
        } else { // Player has bet (currentBet > 0), bot must call or fold
            // weights[0] is fold_prob, weights[1] is call_prob
            if (randomChoice < parseFloat(weights[0])) { 
                botActionString = 'fold';
                logAction("Bot", "folds");
                endHand('player'); 
                return; // Hand is over
            } else { 
                botActionString = 'call';
                if (botChips >= currentBet) {
                    botChips -= currentBet;
                    pot += currentBet;
                    logAction("Bot", "calls", currentBet);
                } else { 
                    botActionString = 'fold'; // Can't call full amount
                    logAction("Bot", "folds (not enough to call)");
                    endHand('player'); 
                    return; // Hand is over
                }
            }
        }

        // Ensure UI is updated after bot's action before deciding next step
        updateUI();

        // Determine next step based on bot's action
        if (!gameInProgress) return; // Check if endHand was called (e.g., bot folded)

        if (botActionString === 'bet') {
            // Bot made a bet. Player must have checked for bot to bet (currentBet was 0, now it's BET_SIZE).
            // Action goes back to the player.
            playerToAct = 'player';
            updateUI(); // Update buttons for player
        } else if (botActionString === 'call') {
            // Bot called player's bet. Betting for this round is over.
            proceedToNextStage();
        } else if (botActionString === 'check') {
            // Bot checked. Player must have also checked (currentBet was 0).
            // Betting for this round is over.
            proceedToNextStage();
        }
    }

    function proceedToNextStage() {
        currentBet = 0; // Reset current bet for the new round/stage
        playerToAct = 'player'; // Player typically starts new round

        if (currentBettingRound === 0) { // Was pre-flop, moving to post-flop
            currentBettingRound = 1;
            gameMessageDiv.textContent = "Community card revealed. Second betting round.";
            // handActionHistory is cumulative for the entire hand.
            updateUI(); // This will reveal community card & update action buttons for player
        } else { // currentBettingRound === 1 (was post-flop), moving to showdown
            currentBettingRound = 2; // Signifies showdown
            showdown(); // Showdown will handle its own UI updates (revealing bot hand etc.)
        }
    }

    function showdown() {
        gameMessageDiv.textContent = "Showdown!";
        currentBettingRound = 2; // Ensure cards are revealed
        updateUI(); // Reveal bot hand and community card fully

        const playerStrength = getHandStrength(playerHand, communityCard);
        const botStrength = getHandStrength(botHand, communityCard);
        
        updateHandStrengths(); // Make sure both are displayed

        const winner = compareHands(playerStrength, botStrength);
        if (winner === 'player') {
            logAction("Player wins the pot of", pot);
            playerChips += pot;
        } else if (winner === 'bot') {
            logAction("Bot wins the pot of", pot);
            botChips += pot;
        } else {
            logAction("It's a tie! Pot is split.");
            playerChips += pot / 2;
            botChips += pot / 2;
        }
        endHand(null, false); // Hand is over, don't assign winner as pot is already handled
    }

    function isHandOver() {
        return !gameInProgress || playerChips <= 0 || botChips <= 0 || currentBettingRound >=2 ;
    }

    function endHand(winner, awardPot = true) {
        if (awardPot) {
            if (winner === 'player') {
                // gameMessageDiv.textContent = `Player wins the pot of ${pot}!`;
                playerChips += pot;
            } else if (winner === 'bot') {
                // gameMessageDiv.textContent = `Bot wins the pot of ${pot}!`;
                botChips += pot;
            }
        }
        pot = 0;
        gameInProgress = false;
        updateUI();
        playerActionsDiv.innerHTML = ''; // Clear action buttons

        if (playerChips <= 0) {
            gameMessageDiv.textContent = "Game Over! Bot wins. You are out of chips.";
            startGameBtn.style.display = 'block';
            newHandBtn.style.display = 'none';
        } else if (botChips <= 0) {
            gameMessageDiv.textContent = "Game Over! Player wins! Bot is out of chips.";
            startGameBtn.style.display = 'block';
            newHandBtn.style.display = 'none';
        } else {
            newHandBtn.style.display = 'inline-block';
        }
    }

    function startNewHand() {
        if (playerChips <= 0 || botChips <= 0) {
             gameMessageDiv.textContent = "Game over. Please start a new game.";
             startGameBtn.style.display = 'block';
             newHandBtn.style.display = 'none';
             return;
        }

        createDeck();
        shuffleDeck();
        dealCards();

        pot = 0;
        currentBet = 0;
        currentBettingRound = 0;
        // Alternate the first player to act
        lastFirstPlayer = lastFirstPlayer === 'player' ? 'bot' : 'player';
        playerToAct = lastFirstPlayer;
        gameInProgress = true;
        
        // Reset history completely
        actionSequence = '';
        actionHistoryLogDiv.textContent = "";
        
        // Log the initial state without affecting history
        gameMessageDiv.textContent = `New hand started. ${playerToAct === 'player' ? 'Player' : 'Bot'} acts first.`;

        // Ante
        if (playerChips >= ANTE && botChips >= ANTE) {
            playerChips -= ANTE;
            botChips -= ANTE;
            pot += ANTE * 2;
            gameMessageDiv.textContent = `Ante ${ANTE} from each player. Pot: ${pot}`;
        } else {
            gameMessageDiv.textContent = "Not enough chips for ante. Game Over.";
            endHand(playerChips < ANTE ? 'bot' : 'player');
            return;
        }
        
        playerStrengthDiv.textContent = "";
        botStrengthDiv.textContent = "";
        gameMessageDiv.textContent = `New hand. ${playerToAct === 'player' ? 'Player' : 'Bot'}'s turn.`;
        newHandBtn.style.display = 'none';
        updateUI();
        
        // If bot is first to act, trigger its action
        if (playerToAct === 'bot') {
            setTimeout(handleBotAction, 1000);
        }
    }
    
    function parseBotWeights() {
        const text = botWeightsInput.value;
        const lines = text.trim().split('\n');
        const newWeights = {};
        let parseErrors = 0;
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            // Example formats:
            // 2 2 pbb         ['0.49', '0.51']
            // 3 ?             ['0.00', '1.00']
            const parts = line.match(/^(\S+)\s+(\S+)(?:\s+(\S+))?\s+\[\s*'([\d\.]+)'\s*,\s*'([\d\.]+)'\s*\]$/);
            if (parts && parts.length === 6) {
                const roundKey = parts[1];
                const stageKey = parts[2];
                const historyKey = parts[3] || ''; // Handle empty history case
                const key = `${roundKey} ${stageKey} ${historyKey}`.trim();
                const weightsArray = [parseFloat(parts[4]), parseFloat(parts[5])];
                if (!isNaN(weightsArray[0]) && !isNaN(weightsArray[1])) {
                    newWeights[key] = weightsArray;
                } else {
                    console.error("Error parsing weights in line: ", line);
                    parseErrors++;
                }
            } else {
                console.error("Error parsing line format: ", line);
                parseErrors++;
            }
        });
        botWeights = newWeights;
        if (parseErrors === 0) {
            gameMessageDiv.textContent = `Bot weights loaded successfully. ${Object.keys(botWeights).length} rules.`;
        } else {
            gameMessageDiv.textContent = `Bot weights loaded with ${parseErrors} errors. ${Object.keys(botWeights).length} rules loaded. Check console.`;
        }
        console.log("Parsed Bot Weights:", botWeights);
    }

    function getBotDecisionKey() {
        // First number is bot's card rank
        const botRank = botHand.rank.toString();
        
        // Second number is community card rank (if revealed)
        const communityRank = currentBettingRound >= 1 ? communityCard.rank.toString() : '?';
        
        // Return format: "botRank communityRank actionSequence"
        return `${botRank} ${communityRank} ${actionSequence}`;
    }

    startGameBtn.addEventListener('click', () => {
        playerChips = INITIAL_CHIPS;
        botChips = INITIAL_CHIPS;
        parseBotWeights(); // Load initial weights
        startNewHand();
        startGameBtn.style.display = 'none';
    });
    newHandBtn.addEventListener('click', startNewHand);
    loadWeightsBtn.addEventListener('click', parseBotWeights);

    // Initialize: Load default weights on page load
    parseBotWeights();
    updateUI(); // Initial UI setup
});