/**********************************************
*Author: Baruch Flores                        *
*Homework 7: FireBase RPS!                    *
*UCB Extension - Full-Stack Bootcamp          *
*June 2018                                    *
***********************************************/

// Initialize Firebase
var config = {
    apiKey: "AIzaSyBTeqAn8EKN1ATOm16HVVD-z0PnRJqSpNo",
    authDomain: "fir-rps-11357.firebaseapp.com",
    databaseURL: "https://fir-rps-11357.firebaseio.com",
    projectId: "fir-rps-11357",
    storageBucket: "",
    messagingSenderId: "82862954265"
};
firebase.initializeApp(config);

db = firebase.database();

//Players DB reference
var playersRef = db.ref("multi-rps/players");

//Player DB Ref
var playerRef;


// Enable logging across page refreshes
// firebase.database.enableLogging(true, true);

// Provide custom logger which prefixes log statements with "[FIREBASE]"
// firebase.database.enableLogging(function (message) {
//     console.log("[FIREBASE]", message);
// });

// var adaNameRef = db.ref('users/ada/name');
// console.log(adaNameRef);
// adaNameRef.child('first').set('Ada');
// adaNameRef.child('last').set('Lovelace');

//global variables
var timeout = 0;
var lockChoice = false;
var child_removed_flag = false; //to attach child_removed event only once;
var child_removed_flag_printPlayerStatus = false;
var click_choice_flag = false;
var child_changed_flag = false;
var click_join_flag = false;


//game player
class player {
    constructor(name, wins, losses, choice) {
        this.name = name;
        this.wins = wins;
        this.losses = losses;
        this.choice = choice;
        this.updateType = "";
    }
}

function addPlayerDB(newPlayer) {
    //We need to determine the player key (1 or 2)
    playersRef.once("value").then(function (ds) {
        var key = ds.numChildren();
        switch (key) {
            case 0:
                playerRef = playersRef.child("1");
                playerRef.set(newPlayer).then(function () {
                    //when self-disconnect
                    playerRef.onDisconnect().remove();
                });
                break;
            case 1:

                playersRef.orderByKey().once("child_added", function (ds2) {
                    var key2 = ds2.key;
                    if (key2 == 1) {
                        playerRef = playersRef.child("2");
                    }
                    else {
                        playerRef = playersRef.child("1");
                    }
                    playerRef.set(newPlayer).then(function () {
                        playerRef.onDisconnect().remove();

                    });
                });
                break;

            default:
                break;
        }
    });
}

function addPlayer() {
    var name = $("#playerName").val().trim();
    if (name) {
        addPlayerDB(new player(name, 0, 0, ""));
        $("#playerName").val("");
    }
}

function printJoin() {
    var join = "<div class='wrapper text-center'>" +
        "<input type='text' class='d-inline w-50' name='playerName' id='playerName' aria-describedby='helpId' placeholder='Type your name here'>" +
        "<input type='button' class='btn btn-primary d-inline join' id='join' value='Join!'> </div>";
    $("#game_status").html(join);
    if (!click_join_flag) {
        click_join_flag = true;
        $("#join").on("click", addPlayer);
        console.log("button join is registered");
    }
}

function printWaitingPlayer(playerNum) {
    var div = "<div class='card player_card'>" +
        "<div class='card-body'>" +
        "<h4 class='card-title'>Waiting for Player " + playerNum + "</h4>" +
        "</div></div>";

    $("#player" + playerNum + "_section").html(div);
}

function printConnectedPlayer(playerNum, ds) {
    var div = "<div class='row player_wrapper text-center'>" +
        "<div class='col-12 align-self-start player_header'>" +
        "<h4 class='player_name'>" + ds.val().name + "</h4>" +
        "</div>" +
        "<div class='col-12 align-self-center mt-1 mb-1 player_choice'>" +
        "</div>" +
        "<div class='col-12 align-self-end player_stats'>" +
        "<span class='player_wins'>Wins: " + ds.val().wins + "</span>" +
        "<span class='player_losses'>Losses: " + ds.val().losses + "</span>" +
        "</div>" +
        "</div>";

    $("#player" + playerNum + "_section").html(div);
}

/**Prints game status according to number of connected players
 */
function printPlayerStatus() {
    playersRef.once("value").then(function (ds) {
        var numPlayers = ds.numChildren();
        switch (numPlayers) {
            //If number of registered players is zero, print Join and Player section waiting.            
            case 0:
                printJoin();
                printWaitingPlayer(1);
                printWaitingPlayer(2);
                break;
            //If it is one, print join and other player name and player section waiting.                
            case 1:
                printJoin();
                if (ds.child("1").exists()) {
                    printWaitingPlayer(2);
                    printConnectedPlayer(1, ds.child("1"));
                }
                else {
                    printWaitingPlayer(1);
                    printConnectedPlayer(2, ds.child("2"));
                }
                break;
            //Two players already?  Print game in Progress.
            default:

                printGameMessage(ds, "in_progress");
                if (!child_removed_flag_printPlayerStatus) {
                    child_removed_flag_printPlayerStatus = true;
                    playersRef.on("child_removed", printPlayerStatus); //only updates the screen when a player disconnects
                }
                break;
        }
    });
}

function clearLastResult() {
    $("#game_result").text("");
}

function restartGame() {
    // clearTimeout(timeout);
    printPlayerChoices(playerRef.key);
    printGameMessage(null, "choice");
    clearLastResult();
    lockChoice = false;
}

function printGameMessage(ds, msg) {

    switch (msg) {
        case "welcome":
            var div = "<div class='text-center' id='game_status_wrapper'>";
            div += "<h4>Hi " + ds.val().name + "! You're Player " + ds.key + "</h4>" +
                "</div>";
            $("#game_status").html(div);
            break;

        case "in_progress":
            var div = "<div class='text-center' id='game_status_wrapper'>";
            div += "<h3>GAME IN PROGRESS... Wait for your turn </h3>" +
                "</div>";
            $("#game_status").html(div);
            break;

        case "choice":
            $("#game_status_wrapper h5:nth-last-child(1)").remove();
            $("#game_status_wrapper br:nth-last-child(1)").remove();
            var ele = "<br><h5>Make your choice...</h5>";
            $("#game_status_wrapper").append(ele);
            break;

        case "waiting_opponent":
            var ele = "Waiting for " + ds.val().name + " to choose";
            $("#game_status_wrapper h5:nth-last-child(1)").text(ele);
            break;

        case "waiting_me":
            var ele = ds.val().name + " is waiting for you to choose";
            $("#game_status_wrapper h5:nth-last-child(1)").text(ele);
            break;

        case "result":
            $("#game_status_wrapper h5:nth-last-child(1)").text("");
            var result;
            if (ds) {
                result = "<div class='card text-white bg-success'>" +
                    "<div class='card-body'>" +
                    "<h5 class='card-title'>" + ds.val().name + "</h5>" +
                    "<h5 class='card-title'>Wins!</h5>" +
                    "</div>" +
                    "</div>";
            }
            else {
                result = "<div class='card text-white bg-dark'>" +
                    "<div class='card-body'>" +
                    "<h5 class='card-title'>It's a TIE!</h5>" +
                    "</div>" +
                    "</div>";

            }
            $("#game_result").html(result);
            break;

        case "disconnected":
            var html = "<div class='card text-white bg-danger'>" +
                "<div class='card-body'>" +
                "<h5 class='card-title'>Player: " + ds.val().name + " disconnected</h5>" +
                "</div>" +
                "</div>";
            $("#game_result").html(html);
            break;
    }
}

function printPlayerChoices(playerNum) {
    $(".player_choice").text("");
    var html = "<div class='btn btn-outline-warning d-inline-block text-danger choice' id='rock'>" +
        "<i class='fas fa-hand-rock fa-3x'></i>" +
        "<h4>rock</h4>" +
        "</div>" +
        "<div class='paper btn btn-outline-warning d-inline-block text-dark choice' id='paper'>" +
        "<i class='fas fa-hand-paper fa-3x '></i>" +
        "<h4>paper</h4>" +
        "</div>" +
        "<div class='scissors btn btn-outline-warning d-inline-block text-info choice' id='scissors'>" +
        "<i class='fas fa-hand-scissors fa-3x'></i>" +
        "<h4>scissors</h4>" +
        "</div>";

    $("#player" + playerNum + "_section .player_choice").html(html);
}

/**
 * Prints the latest player status
 */
function updatePlayerStatus(ds) {

    console.log("child_added playersreference");
    //if current observer has joined the game
    if (playerRef) {

        printConnectedPlayer(ds.key, ds);
        if (playerRef.key == ds.key) {

            printGameMessage(ds, "welcome");

            //are we two players already ?
            playersRef.once("value").then(function (ds2) {
                if (ds2.numChildren() == 2) {

                    //we're ready to play. Now listen for updates and connection drops
                    listenForPlayerChoice();
                    listenForDroppedConnections();
                    printGameMessage(null, "choice");
                    printPlayerChoices(ds.key);
                }
            });
        }
        else {
            //we're ready to play. Now listen for updates and connection drops
            listenForPlayerChoice();
            listenForDroppedConnections();
            printGameMessage(null, "choice");
            printPlayerChoices(playerRef.key);

        }
    }
    else {
        playersRef.once("value").then(function (ds2) {
            if (ds2.numChildren() == 2) {
                // if there are 2 players connected already
                printGameMessage(ds, "in_progress");
                $(".player_section").html("");
                //only updates the screen when a player disconnects
                listenForDroppedConnections();
            }
            else {
                //print the player that just connected
                printConnectedPlayer(ds.key, ds);
            }
        });

    }

}

/**
 * Monitors Players DB reference and updates HTML accordingly
 */
function listenForConnections() {
    playersRef.on("child_added", updatePlayerStatus);
}

function updateChoiceDB() {

    if (!lockChoice) {
        lockChoice = true;

        var choice = $(this).attr("id");

        //remove other choices
        switch (choice) {

            case "rock":
                $("#paper").remove();
                $("#scissors").remove();
                break;
            case "paper":
                $("#rock").remove();
                $("#scissors").remove();
                break;
            case "scissors":
                $("#paper").remove();
                $("#rock").remove();
                break;
        }

        playerRef.update({ choice: choice, updateType: "choice" }).then(function () {
            console.log("choice updated");
        });
    }
}

function printOpponentChoice(ds) {
    var html;

    switch (ds.val().choice) {

        case "rock":
            html = "<div class='btn btn-outline-warning d-inline-block text-danger choice' id='rock'>" +
                "<i class='fas fa-hand-rock fa-3x'></i>" +
                "<h4>rock</h4>" +
                "</div>";
            break;
        case "paper":
            html = "<div class='paper btn btn-outline-warning d-inline-block text-dark choice' id='paper'>" +
                "<i class='fas fa-hand-paper fa-3x '></i>" +
                "<h4>paper</h4>" +
                "</div>";
            break;
        case "scissors":
            html = "<div class='scissors btn btn-outline-warning d-inline-block text-info choice' id='scissors'>" +
                "<i class='fas fa-hand-scissors fa-3x'></i>" +
                "<h4>scissors</h4>" +
                "</div>";
            break;
    }
    $("#player" + ds.key + "_section .player_choice").html(html);
}

function updateScoresHtml(player) {

    $("#player" + player.key + "_section .player_wins").text("Wins: " + player.val().wins);
    $("#player" + player.key + "_section .player_losses").text("Losses: " + player.val().losses);
}

function updateScoresDB(status, player) {

    switch (status) {
        case "winner":
            player.ref.update({ wins: player.val().wins + 1, choice: "", updateType: "score" });
            break;
        case "loser":
            player.ref.update({ losses: player.val().losses + 1, choice: "", updateType: "score" });
            break;
    }
}

function computeResult(me, opponent) {

    if (me.val().choice == opponent.val().choice) {

        me.ref.update({ choice: "", updateType: "tie" });
        return null;
    }
    else {
        var winner;

        //avoids triggering the evaluation of player choices because 
        //I just want to update winnings/loses and restart choices
        switch (me.val().choice) {
            case "rock":
                winner = opponent.val().choice == "paper" ? opponent : me;
                break;

            case "paper":
                winner = opponent.val().choice == "rock" ? me : opponent;
                break;

            case "scissors":
                winner = opponent.val().choice == "paper" ? me : opponent;
                break;
        }

        winner.key == me.key ? updateScoresDB("winner", me) : updateScoresDB("loser", me);
        return winner;
    }
}

function resolveGame(me, opponent) {

    printOpponentChoice(opponent);
    var result = computeResult(me, opponent);
    printGameMessage(result, "result");
    timeout = setTimeout(restartGame, 2500);
}

function processChoice(ds) {

    //choice is mine
    if (playerRef.key == ds.key) {

        if (ds.key == 1) {
            playersRef.child("2").once("value").then(function (ds2) {

                if (ds2.val().choice == "") {
                    printGameMessage(ds2, "waiting_opponent");
                }
                else {
                    resolveGame(ds, ds2);
                }
            });
        }
        else {
            playersRef.child("1").once("value").then(function (ds2) {

                if (ds2.val().choice == "") {
                    printGameMessage(ds2, "waiting_opponent");
                }
                else {
                    resolveGame(ds, ds2);
                }
            });
        }
    }
    //opponent has chosen
    else {
        playerRef.once("value").then(function (ds2) {

            if (ds2.val().choice == "") {
                printGameMessage(ds, "waiting_me");
            }
            else {
                resolveGame(ds2, ds);
            }
        });
    }

}

function processDisconnection(ds) {
    clearLastResult();
    if (ds.key == 1) {
        printWaitingPlayer(2);
    }
    else {
        printWaitingPlayer(1);
    }
    printGameMessage(ds, "welcome");
    lockChoice = false;
}

function onPlayerChanged(ds) {

    //type of update
    console.log("player change detected");
    switch (ds.val().updateType) {
        case "choice":
            processChoice(ds);
            break;

        case "score":
            updateScoresHtml(ds);
            break;

        case "disconnected":
            $(".player_choice").text("");
            timeout = setTimeout(function () {
                processDisconnection(ds);
            }, 2000);
            break;

        default:
            break;
    }

}

function listenForPlayerChoice() {

    if (!click_choice_flag) {
        click_choice_flag = true;
        //When user clicks the button to make a choice
        $(document).on("click", ".choice", updateChoiceDB);
    }

    if (!child_changed_flag) {
        child_changed_flag = true;
        // when that choice is updated in the DB
        playersRef.on("child_changed", onPlayerChanged);
    }
}

function listenForDroppedConnections() {
    // make sure this is always active but never called twice
    if (!child_removed_flag) {
        child_removed_flag = true;
        playersRef.on("child_removed", function (ds) {
            console.log("child removed detected");

            //only if I am a registered player (not an observer)
            if (playerRef) {
                printGameMessage(ds, "disconnected");
                //in case there's any timeout
                clearTimeout(timeout);
                //ensures the DB really gets updated with updateType
                // (in case two connection drops happen in a row for instance)
                playerRef.update({ updateType: "" });
                playerRef.update({ choice: "", updateType: "disconnected" });
            }
            else {
                printPlayerStatus();
            }
        });
    }
}

function newGame() {
    printPlayerStatus();
    listenForConnections();
}

$(document).ready(function () {

    newGame();

});