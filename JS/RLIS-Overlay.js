const WsSubscribers = {
    __subscribers: {},
    websocket: undefined,
    webSocketConnected: false,
    registerQueue: [],
    init: function(port, debug, debugFilters) {
        port = port || 49322;
        debug = debug || false;
        if (debug) {
            if (debugFilters !== undefined) {
                console.warn("WebSocket Debug Mode enabled with filtering. Only events not in the filter list will be dumped");
            } else {
                console.warn("WebSocket Debug Mode enabled without filters applied. All events will be dumped to console");
                console.warn("To use filters, pass in an array of 'channel:event' strings to the second parameter of the init function");
            }
        }
        WsSubscribers.webSocket = new WebSocket("ws://localhost:" + port);
        WsSubscribers.webSocket.onmessage = function (event) {
            let jEvent = JSON.parse(event.data);
            if (!jEvent.hasOwnProperty('event')) {
                return;
            }
            let eventSplit = jEvent.event.split(':');
            let channel = eventSplit[0];
            let event_event = eventSplit[1];
            if (debug) {
                if (!debugFilters) {
                    console.log(channel, event_event, jEvent);
                } else if (debugFilters && debugFilters.indexOf(jEvent.event) < 0) {
                    console.log(channel, event_event, jEvent);
                }
            }
            WsSubscribers.triggerSubscribers(channel, event_event, jEvent.data);
        };
        WsSubscribers.webSocket.onopen = function () {
            WsSubscribers.triggerSubscribers("ws", "open");
            WsSubscribers.webSocketConnected = true;
            WsSubscribers.registerQueue.forEach((r) => {
                WsSubscribers.send("wsRelay", "register", r);
            });
            WsSubscribers.registerQueue = [];
        };
        WsSubscribers.webSocket.onerror = function () {
            WsSubscribers.triggerSubscribers("ws", "error");
            WsSubscribers.webSocketConnected = false;
        };
        WsSubscribers.webSocket.onclose = function () {
            WsSubscribers.triggerSubscribers("ws", "close");
            WsSubscribers.webSocketConnected = false;
        };
    },
    /**
     * Add callbacks for when certain events are thrown
     * Execution is guaranteed to be in First In First Out order
     * @param channels
     * @param events
     * @param callback
     */
    subscribe: function(channels, events, callback) {
        if (typeof channels === "string") {
            let channel = channels;
            channels = [];
            channels.push(channel);
        }
        if (typeof events === "string") {
            let event = events;
            events = [];
            events.push(event);
        }
        channels.forEach(function(c) {
            events.forEach(function (e) {
                if (!WsSubscribers.__subscribers.hasOwnProperty(c)) {
                    WsSubscribers.__subscribers[c] = {};
                }
                if (!WsSubscribers.__subscribers[c].hasOwnProperty(e)) {
                    WsSubscribers.__subscribers[c][e] = [];
                    if (WsSubscribers.webSocketConnected) {
                        WsSubscribers.send("wsRelay", "register", `${c}:${e}`);
                    } else {
                        WsSubscribers.registerQueue.push(`${c}:${e}`);
                    }
                }
                WsSubscribers.__subscribers[c][e].push(callback);
            });
        })
    },
    clearEventCallbacks: function (channel, event) {
        if (WsSubscribers.__subscribers.hasOwnProperty(channel) && WsSubscribers.__subscribers[channel].hasOwnProperty(event)) {
            WsSubscribers.__subscribers[channel] = {};
        }
    },
    triggerSubscribers: function (channel, event, data) {
        if (WsSubscribers.__subscribers.hasOwnProperty(channel) && WsSubscribers.__subscribers[channel].hasOwnProperty(event)) {
            WsSubscribers.__subscribers[channel][event].forEach(function(callback) {
                if (callback instanceof Function) {
                    callback(data);
                }
            });
        }
    },
    send: function (channel, event, data) {
        if (typeof channel !== 'string') {
            console.error("Channel must be a string");
            return;
        }
        if (typeof event !== 'string') {
            console.error("Event must be a string");
            return;
        }
        if (channel === 'local') {
            this.triggerSubscribers(channel, event, data);
        } else {
            let cEvent = channel + ":" + event;
            WsSubscribers.webSocket.send(JSON.stringify({
                'event': cEvent,
                'data': data
            }));
        }
    }
};

var autoNames = true;
$(() => {
	WsSubscribers.init(49322, true)
	WsSubscribers.subscribe("game", "update_state", (d) => {
	    var blueName = d['game']['teams'][0]['name'];
	    var orangeName = d['game']['teams'][1]['name'];
		$(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-top .overlay-full-score-area .overlay-blue-scoreboard-area .overlay-blue-score-area .overlay-blue-score").text(d['game']['teams'][0]['score']);
		$(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-top .overlay-full-score-area .overlay-orange-scoreboard-area .overlay-orange-score-area .overlay-orange-score").text(d['game']['teams'][1]['score']);

        if(autoNames == true){
            $(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-top .overlay-full-score-area .overlay-blue-scoreboard-area .overlay-blue-team-name-area .overlay-blue-team-name").text(blueName);
            $(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-top .overlay-full-score-area .overlay-orange-scoreboard-area .overlay-orange-team-name-area .overlay-orange-team-name").text(orangeName);

            var orangeImg = document.getElementById('orangeImg');
            var blueImg = document.getElementById('blueImg');
            blueImg.src = "Images/MoojuLogo.png";
            orangeImg.src = "Images/MoojuLogo.png";
        }

		var timeLeft = parseInt(d['game']['time_seconds']);
		var m = Math.floor(timeLeft/60);
		var s = (timeLeft - (m*60));
		if(s.toString().length < 2){
		s = "0" + s;
		}
		var TimeLeft = m + ":" + s;
		if(d['game']['isOT'] == "true"){
		TimeLeft = "+" + TimeLeft;
		}
		$(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-top .overlay-full-score-area .overlay-timer-area .overlay-timer").text(TimeLeft);

		var blueMembers = 0;
		var orangeMembers = 0;
		let bluePlayerBoost1 = document.getElementById("bluePlayerBoost1");
		let bluePlayerBoost2 = document.getElementById("bluePlayerBoost2");
		let bluePlayerBoost3 = document.getElementById("bluePlayerBoost3");
		let orangePlayerBoost1 = document.getElementById("orangePlayerBoost1");
		let orangePlayerBoost2 = document.getElementById("orangePlayerBoost2");
		let orangePlayerBoost3 = document.getElementById("orangePlayerBoost3");

		let bluePlayer1 = document.getElementById("bluePlayer1");
		let bluePlayer2 = document.getElementById("bluePlayer2");
		let bluePlayer3 = document.getElementById("bluePlayer3");
		let orangePlayer1 = document.getElementById("orangePlayer1");
		let orangePlayer2 = document.getElementById("orangePlayer2");
		let orangePlayer3 = document.getElementById("orangePlayer3");
		let activeBlue = "linear-gradient(to right, #001024, #004478)";
		let inactiveBlue = "linear-gradient(to right, #003576, #007ad8)";
		let activeOrange = "linear-gradient(to left, #683400, #b45500)";
		let inactiveOrange = "linear-gradient(to left, #ae5600, #f77400)";
		let demoedBlue = "linear-gradient(to left, #bbbbbb, #525252)";
		let demoedOrange = "linear-gradient(to left, #525252, #bbbbbb)";
		let testActiveBlue = "linear-gradient(to left, #bbbbbb, #525252)";
		let testActiveOrange = "linear-gradient(to left, #ae5600, #f77400)";

		let blueSpectating = document.getElementById("blueSpectating");
		let blueSpectatingName = document.getElementById("blueSpectatingName");
		let blueSpectatingBoost = document.getElementById("blueSpectatingBoost");
		let orangeSpectating = document.getElementById("orangeSpectating");
        let orangeSpectatingName = document.getElementById("orangeSpectatingName");
        let orangeSpectatingBoost = document.getElementById("orangeSpectatingBoost");

		Object.keys(d['players']).forEach((id) => {
		    if(d['players'][id].team == 0){
		        blueMembers += 1;

		        let currentBluePlayer = document.getElementById("bluePlayer" + blueMembers);
		        if(d['game']['isReplay'] == false){
                    currentBluePlayer.style.visibility = 'visible';
                    currentBluePlayer.style.background = inactiveBlue;
                }

		        var gradientAmount = "linear-gradient(to left, #2c2c2c " + (100 - d['players'][id].boost) + "%, #ffa500 0%, #e09100)";
		        $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-name-area-" + blueMembers +"  .overlay-blue-name-" + blueMembers +" .overlay-blue-name-" + blueMembers +"-text").text(d['players'][id].name);
		        $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-info-area-" + blueMembers +"  .overlay-blue-stats-" + blueMembers +" .overlay-blue-goals-" + blueMembers +" .overlay-blue-goals-amount-" + blueMembers).text(d['players'][id].goals);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-info-area-" + blueMembers +"  .overlay-blue-stats-" + blueMembers +" .overlay-blue-shots-" + blueMembers +" .overlay-blue-shots-amount-" + blueMembers).text(d['players'][id].shots);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-info-area-" + blueMembers +"  .overlay-blue-stats-" + blueMembers +" .overlay-blue-assists-" + blueMembers +" .overlay-blue-assists-amount-" + blueMembers).text(d['players'][id].assists);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-info-area-" + blueMembers +"  .overlay-blue-stats-" + blueMembers +" .overlay-blue-saves-" + blueMembers +" .overlay-blue-saves-amount-" + blueMembers).text(d['players'][id].saves);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-boost-area-" + blueMembers +" .overlay-blue-boost-amount-" + blueMembers).text(d['players'][id].boost);

		        if (d['players'][id].id == d['game']['target']) {
		            orangePlayer1.style.background = inactiveOrange;
		            orangePlayer2.style.background = inactiveOrange;
		            orangePlayer3.style.background = inactiveOrange;
		            orangeSpectating.style.visibility = 'hidden';
		            if((blueMembers - 3) == 0){
		                bluePlayer3.style.background = activeBlue;
		                bluePlayer2.style.background = inactiveBlue;
		                bluePlayer1.style.background = inactiveBlue;
		            }else if((blueMembers - 3) == -1){
		                bluePlayer2.style.background = activeBlue;
                        bluePlayer3.style.background = inactiveBlue;
                        bluePlayer1.style.background = inactiveBlue;
		            }else if((blueMembers - 3) == -2){
                        bluePlayer1.style.background = activeBlue;
                        bluePlayer3.style.background = inactiveBlue;
                        bluePlayer2.style.background = inactiveBlue;
		            }
		            blueSpectatingName.innerHTML = d['players'][id].name;
		            blueSpectating.style.visibility = 'visible';
		            blueSpectatingBoost.style.background = gradientAmount;
		        }

		        if(blueMembers == 1){
                    bluePlayerBoost1.style.background = gradientAmount;
                }else if(blueMembers == 2){
                    bluePlayerBoost2.style.background = gradientAmount;
                }else if(blueMembers == 3){
                    bluePlayerBoost3.style.background = gradientAmount;
                }

		    }else if(d['players'][id].team == 1){
                orangeMembers += 1;

                let currentOrangePlayer = document.getElementById("orangePlayer" + orangeMembers);
                if(d['game']['isReplay'] == false){
                    currentOrangePlayer.style.visibility = 'visible';
                    currentOrangePlayer.style.background = inactiveOrange;
                }

                var gradientAmount = "linear-gradient(to right, #2c2c2c " + (100 - d['players'][id].boost) + "%, #ffa500 0%, #e09100)";
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-name-area-" + orangeMembers +"  .overlay-orange-name-" + orangeMembers +" .overlay-orange-name-" + orangeMembers +"-text").text(d['players'][id].name);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-info-area-" + orangeMembers +"  .overlay-orange-stats-" + orangeMembers +" .overlay-orange-goals-" + orangeMembers +" .overlay-orange-goals-amount-" + orangeMembers).text(d['players'][id].goals);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-info-area-" + orangeMembers +"  .overlay-orange-stats-" + orangeMembers +" .overlay-orange-shots-" + orangeMembers +" .overlay-orange-shots-amount-" + orangeMembers).text(d['players'][id].shots);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-info-area-" + orangeMembers +"  .overlay-orange-stats-" + orangeMembers +" .overlay-orange-assists-" + orangeMembers +" .overlay-orange-assists-amount-" + orangeMembers).text(d['players'][id].assists);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-info-area-" + orangeMembers +"  .overlay-orange-stats-" + orangeMembers +" .overlay-orange-saves-" + orangeMembers +" .overlay-orange-saves-amount-" + orangeMembers).text(d['players'][id].saves);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-boost-area-" + orangeMembers +" .overlay-orange-boost-amount-" + orangeMembers).text(d['players'][id].boost);

                if (d['players'][id].id == d['game']['target']) {
                    bluePlayer1.style.background = inactiveBlue;
                    bluePlayer2.style.background = inactiveBlue;
                    bluePlayer3.style.background = inactiveBlue;
                    blueSpectating.style.visibility = 'hidden';
                    if((orangeMembers - 3) == 0){
                        orangePlayer3.style.background = activeOrange;
                        orangePlayer2.style.background = inactiveOrange;
                        orangePlayer1.style.background = inactiveOrange;
                    }else if((orangeMembers - 3) == -1){
                        orangePlayer2.style.background = activeOrange;
                        orangePlayer3.style.background = inactiveOrange;
                        orangePlayer1.style.background = inactiveOrange;
                    }else if((orangeMembers - 3) == -2){
                        orangePlayer1.style.background = activeOrange;
                        orangePlayer2.style.background = inactiveOrange;
                        orangePlayer3.style.background = inactiveOrange;
                    }
                    orangeSpectatingName.innerHTML = d['players'][id].name;
                    orangeSpectating.style.visibility = 'visible';
                    orangeSpectatingBoost.style.background = gradientAmount;
                }

                if(orangeMembers == 1){
                    orangePlayerBoost1.style.background = gradientAmount;
                }else if(orangeMembers == 2){
                    orangePlayerBoost2.style.background = gradientAmount;
                }else if(orangeMembers == 3){
                    orangePlayerBoost3.style.background = gradientAmount;
                }
		    }

		    if(d['game']['isReplay'] == true){
                orangePlayer1.style.visibility = 'hidden';
                orangePlayer2.style.visibility = 'hidden';
                orangePlayer3.style.visibility = 'hidden';
                bluePlayer1.style.visibility = 'hidden';
                bluePlayer2.style.visibility = 'hidden';
                bluePlayer3.style.visibility = 'hidden';
                blueSpectating.style.visibility = 'hidden';
                orangeSpectating.style.visibility = 'hidden';
            }
            if(d['game']['hasWinner'] == true){
                orangePlayer1.style.visibility = 'hidden';
                orangePlayer2.style.visibility = 'hidden';
                orangePlayer3.style.visibility = 'hidden';
                bluePlayer1.style.visibility = 'hidden';
                bluePlayer2.style.visibility = 'hidden';
                bluePlayer3.style.visibility = 'hidden';
                blueSpectating.style.visibility = 'hidden';
                orangeSpectating.style.visibility = 'hidden';
            }
        });

        blueMembers = 0;
        orangeMembers = 0;
        Object.keys(d['players']).forEach((id) => {
            if(d['players'][id].team == 0){
                blueMembers += 1;
                if(blueMembers == 1){
                    if(d['players'][id].isDead == true){
                        bluePlayer1.style.background = demoedBlue;
                    }
                }else if(blueMembers == 2){
                    if(d['players'][id].isDead == true){
                        bluePlayer2.style.background = demoedBlue;
                    }
                }else if(blueMembers == 3){
                    if(d['players'][id].isDead == true){
                        bluePlayer3.style.background = demoedBlue;
                    }
                }
            }else if(d['players'][id].team == 1){
                orangeMembers += 1;
                if(orangeMembers == 1){
                    if(d['players'][id].isDead == true){
                        orangePlayer1.style.background = demoedOrange;
                    }
                }else if(orangeMembers == 2){
                    if(d['players'][id].isDead == true){
                        orangePlayer2.style.background = demoedOrange;
                    }
                }else if(orangeMembers == 3){
                    if(d['players'][id].isDead == true){
                        orangePlayer3.style.background = demoedOrange;
                    }
                }
            }
        });
	});

    let assistBoolean = false;
	WsSubscribers.subscribe("game", "goal_scored", (e) => {
	      var scorer = " " + e['scorer']['name'];
    	  $(".overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-scored-by-area .overlay-scored-by-player-name").text(scorer);
    	  let replayBanner = document.getElementById("replayBanner");
    	  let assistArea = document.getElementById("assistArea");
    	  if(e['scorer']['teamnum'] == 0){
    	    var gradientAmount = "linear-gradient(to top, #003576, #0000 85%)";
    	    replayBanner.style.background = gradientAmount;
    	  }else{
    	    var gradientAmount = "linear-gradient(to top, #ae5600, #0000 85%)";
    	    replayBanner.style.background = gradientAmount;
    	  }
          if(e['assister']['name'] == ""){
            $(".overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-assist-area .overlay-assist-player-name").text("None");
            assistArea.style.visibility = "hidden";
            assistBoolean = false;
          }else{
            var assister = " " + e['assister']['name'];
            $(".overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-assist-area .overlay-assist-player-name").text(assister);
            assistBoolean = true;
          }
          var goalSpeed = " " +  Math.round(e['goalspeed']) + " KM/H";
          $(".overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-speed-area .overlay-speed-value").text(goalSpeed);
    });

	WsSubscribers.subscribe("game", "replay_start", (e) => {
        let replayBanner = document.getElementById("replayBanner");
        replayBanner.style.visibility = 'visible';
        if(assistBoolean == true){
            assistArea.style.visibility = "visible";
        }
    });

    WsSubscribers.subscribe("game", "replay_end", (e) => {
        let replayBanner = document.getElementById("replayBanner");
        replayBanner.style.visibility = 'hidden'
        assistArea.style.visibility = "hidden";
    });

    WsSubscribers.subscribe("tournament", "abbrv", (e) => {
        $(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-bottom .overlay-info-area .overlay-info-area-left .overlay-info-left-text").text(e);
    });

    WsSubscribers.subscribe("tournament", "stage", (e) => {
        $(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-bottom .overlay-info-area .overlay-info-area-middle .overlay-stage-text").text(e);
    });

    var blueCount = 0;
    var orangeCount = 0;
    WsSubscribers.subscribe("series", "none", (e) => {
            var i = "Show Match";
            blueCount = 0;
            orangeCount = 0;
            $(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-bottom .overlay-info-area .overlay-info-area-right .overlay-info-right-text").text(i);
            document.getElementById("blueG1").style.visibility = "hidden";
            document.getElementById("blueG2").style.visibility = "hidden";
            document.getElementById("blueG3").style.visibility = "hidden";
            document.getElementById("blueG4").style.visibility = "hidden";
            document.getElementById("blueG5").style.visibility = "hidden";
            document.getElementById("orangeG1").style.visibility = "hidden";
            document.getElementById("orangeG2").style.visibility = "hidden";
            document.getElementById("orangeG3").style.visibility = "hidden";
            document.getElementById("orangeG4").style.visibility = "hidden";
            document.getElementById("orangeG5").style.visibility = "hidden";
            document.getElementById("blueG1").style.color = "#000";
            document.getElementById("blueG2").style.color = "#000";
            document.getElementById("blueG3").style.color = "#000";
            document.getElementById("blueG4").style.color = "#000";
            document.getElementById("blueG5").style.color = "#000";
            document.getElementById("orangeG1").style.color = "#000";
            document.getElementById("orangeG2").style.color = "#000";
            document.getElementById("orangeG3").style.color = "#000";
            document.getElementById("orangeG4").style.color = "#000";
            document.getElementById("orangeG5").style.color = "#000";
    });

    WsSubscribers.subscribe("series", "bo3", (e) => {
            blueCount = 0;
            orangeCount = 0;
            var i = "BO3";
            $(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-bottom .overlay-info-area .overlay-info-area-right .overlay-info-right-text").text(i);
            document.getElementById("blueG1").style.visibility = "visible";
            document.getElementById("blueG2").style.visibility = "visible";
            document.getElementById("blueG3").style.visibility = "hidden";
            document.getElementById("blueG4").style.visibility = "hidden";
            document.getElementById("blueG5").style.visibility = "hidden";
            document.getElementById("orangeG1").style.visibility = "visible";
            document.getElementById("orangeG2").style.visibility = "visible";
            document.getElementById("orangeG3").style.visibility = "hidden";
            document.getElementById("orangeG4").style.visibility = "hidden";
            document.getElementById("orangeG5").style.visibility = "hidden";
            document.getElementById("blueG1").style.color = "#000";
            document.getElementById("blueG2").style.color = "#000";
            document.getElementById("blueG3").style.color = "#000";
            document.getElementById("blueG4").style.color = "#000";
            document.getElementById("blueG5").style.color = "#000";
            document.getElementById("orangeG1").style.color = "#000";
            document.getElementById("orangeG2").style.color = "#000";
            document.getElementById("orangeG3").style.color = "#000";
            document.getElementById("orangeG4").style.color = "#000";
            document.getElementById("orangeG5").style.color = "#000";
    });

    WsSubscribers.subscribe("series", "bo5", (e) => {
            blueCount = 0;
            orangeCount = 0;
            var i = "BO5";
            $(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-bottom .overlay-info-area .overlay-info-area-right .overlay-info-right-text").text(i);
            document.getElementById("blueG1").style.visibility = "visible";
            document.getElementById("blueG2").style.visibility = "visible";
            document.getElementById("blueG3").style.visibility = "visible";
            document.getElementById("blueG4").style.visibility = "hidden";
            document.getElementById("blueG5").style.visibility = "hidden";
            document.getElementById("orangeG1").style.visibility = "visible";
            document.getElementById("orangeG2").style.visibility = "visible";
            document.getElementById("orangeG3").style.visibility = "visible";
            document.getElementById("orangeG4").style.visibility = "hidden";
            document.getElementById("orangeG5").style.visibility = "hidden";
            document.getElementById("blueG1").style.color = "#000";
            document.getElementById("blueG2").style.color = "#000";
            document.getElementById("blueG3").style.color = "#000";
            document.getElementById("blueG4").style.color = "#000";
            document.getElementById("blueG5").style.color = "#000";
            document.getElementById("orangeG1").style.color = "#000";
            document.getElementById("orangeG2").style.color = "#000";
            document.getElementById("orangeG3").style.color = "#000";
            document.getElementById("orangeG4").style.color = "#000";
            document.getElementById("orangeG5").style.color = "#000";
    });

    WsSubscribers.subscribe("series", "bo7", (e) => {
            blueCount = 0;
            orangeCount = 0;
            var i = "BO7";
            $(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-bottom .overlay-info-area .overlay-info-area-right .overlay-info-right-text").text(i);
            document.getElementById("blueG1").style.visibility = "visible";
            document.getElementById("blueG2").style.visibility = "visible";
            document.getElementById("blueG3").style.visibility = "visible";
            document.getElementById("blueG4").style.visibility = "visible";
            document.getElementById("blueG5").style.visibility = "hidden";
            document.getElementById("orangeG1").style.visibility = "visible";
            document.getElementById("orangeG2").style.visibility = "visible";
            document.getElementById("orangeG3").style.visibility = "visible";
            document.getElementById("orangeG4").style.visibility = "visible";
            document.getElementById("orangeG5").style.visibility = "hidden";
            document.getElementById("blueG1").style.color = "#000";
            document.getElementById("blueG2").style.color = "#000";
            document.getElementById("blueG3").style.color = "#000";
            document.getElementById("blueG4").style.color = "#000";
            document.getElementById("blueG5").style.color = "#000";
            document.getElementById("orangeG1").style.color = "#000";
            document.getElementById("orangeG2").style.color = "#000";
            document.getElementById("orangeG3").style.color = "#000";
            document.getElementById("orangeG4").style.color = "#000";
            document.getElementById("orangeG5").style.color = "#000";
    });

    WsSubscribers.subscribe("series", "bo9", (e) => {
            blueCount = 0;
            orangeCount = 0;
            var i = "BO9";
            $(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-bottom .overlay-info-area .overlay-info-area-right .overlay-info-right-text").text(i);
            document.getElementById("blueG1").style.visibility = "visible";
            document.getElementById("blueG2").style.visibility = "visible";
            document.getElementById("blueG3").style.visibility = "visible";
            document.getElementById("blueG4").style.visibility = "visible";
            document.getElementById("blueG5").style.visibility = "visible";
            document.getElementById("orangeG1").style.visibility = "visible";
            document.getElementById("orangeG2").style.visibility = "visible";
            document.getElementById("orangeG3").style.visibility = "visible";
            document.getElementById("orangeG4").style.visibility = "visible";
            document.getElementById("orangeG5").style.visibility = "visible";
            document.getElementById("blueG1").style.color = "#000";
            document.getElementById("blueG2").style.color = "#000";
            document.getElementById("blueG3").style.color = "#000";
            document.getElementById("blueG4").style.color = "#000";
            document.getElementById("blueG5").style.color = "#000";
            document.getElementById("orangeG1").style.color = "#000";
            document.getElementById("orangeG2").style.color = "#000";
            document.getElementById("orangeG3").style.color = "#000";
            document.getElementById("orangeG4").style.color = "#000";
            document.getElementById("orangeG5").style.color = "#000";
    });

    WsSubscribers.subscribe("series", "BluePlus", (e) => {
        var blue1 = document.getElementById('blueG1');
        var blue2 = document.getElementById('blueG2');
        var blue3 = document.getElementById('blueG3');
        var blue4 = document.getElementById('blueG4');
        var blue5 = document.getElementById('blueG5');
        if(blueCount == 0){
          blue1.style.color = "#2ed8ff";
          blueCount = 1;
        }else if(blueCount == 1){
          blue2.style.color = "#2ed8ff";
          blueCount = 2;
        }else if(blueCount == 2){
          blue3.style.color = "#2ed8ff";
          blueCount = 3;
        }else if(blueCount == 3){
          blue4.style.color = "#2ed8ff";
          blueCount = 4;
        }else if(blueCount == 4){
          blue5.style.color = "#2ed8ff";
          blueCount = 5;
        }
    });
    WsSubscribers.subscribe("series", "BlueMinus", (e) => {
        var blue1 = document.getElementById('blueG1');
        var blue2 = document.getElementById('blueG2');
        var blue3 = document.getElementById('blueG3');
        var blue4 = document.getElementById('blueG4');
        var blue5 = document.getElementById('blueG5');
        if(blueCount == 5){
          blue5.style.color = "#000";
          blueCount = 4;
        }else if(blueCount == 4){
          blue4.style.color = "#000";
          blueCount = 3;
        }else if(blueCount == 3){
          blue3.style.color = "#000";
          blueCount = 2;
        }else if(blueCount == 2){
          blue2.style.color = "#000";
          blueCount = 1;
        }else if(blueCount == 1){
          blue1.style.color = "#000";
          blueCount = 0;
        }
    });
    WsSubscribers.subscribe("series", "OrangePlus", (e) => {
        var Orange1 = document.getElementById('orangeG1');
        var Orange2 = document.getElementById('orangeG2');
        var Orange3 = document.getElementById('orangeG3');
        var Orange4 = document.getElementById('orangeG4');
        var Orange5 = document.getElementById('orangeG5');
        if(orangeCount == 0){
          Orange1.style.color = "#ffcd2e";
          orangeCount = 1;
        }else if(orangeCount == 1){
          Orange2.style.color = "#ffcd2e";
          orangeCount = 2;
        }else if(orangeCount == 2){
          Orange3.style.color = "#ffcd2e";
          orangeCount = 3;
        }else if(orangeCount == 3){
          Orange4.style.color = "#ffcd2e";
          orangeCount = 4;
        }else if(orangeCount == 4){
           Orange5.style.color = "#ffcd2e";
           orangeCount = 5;
       }
    });
    WsSubscribers.subscribe("series", "OrangeMinus", (e) => {
        var Orange1 = document.getElementById('orangeG1');
        var Orange2 = document.getElementById('orangeG2');
        var Orange3 = document.getElementById('orangeG3');
        var Orange4 = document.getElementById('orangeG4');
        var Orange5 = document.getElementById('orangeG5');
        if(orangeCount == 5){
          Orange5.style.color = "#000";
          orangeCount = 4;
        }else if(orangeCount == 4){
          Orange4.style.color = "#000";
          orangeCount = 3;
        }else if(orangeCount == 3){
          Orange3.style.color = "#000";
          orangeCount = 2;
        }else if(orangeCount == 2){
          Orange2.style.color = "#000";
          orangeCount = 1;
        }else if(orangeCount == 1){
          Orange1.style.color = "#000";
          orangeCount = 0;
        }
    });

    WsSubscribers.subscribe("Team", "blueCeltic", (e) => {
        var blueName = document.getElementById('blueTeamName');
        var blueImg = document.getElementById('blueImg');;
        blueName.innerHTML = "Celtic Tigers";
        blueImg.src = "Images/celtic_tigers_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueWolf", (e) => {
        var blueName = document.getElementById('blueTeamName');
        var blueImg = document.getElementById('blueImg');;
        blueName.innerHTML = "Wolfhounds";
        blueImg.src = "Images/irish_wolfhounds_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueBanshee", (e) => {
        var blueName = document.getElementById('blueTeamName');
        var blueImg = document.getElementById('blueImg');;
        blueName.innerHTML = "Banshees";
        blueImg.src = "Images/the_banshees_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueKings", (e) => {
        var blueName = document.getElementById('blueTeamName');
        var blueImg = document.getElementById('blueImg');;
        blueName.innerHTML = "High Kings";
        blueImg.src = "Images/the_high_kings_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueSetanta", (e) => {
        var blueName = document.getElementById('blueTeamName');
        var blueImg = document.getElementById('blueImg');;
        blueName.innerHTML = "Setanta";
        blueImg.src = "Images/setanta_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueSaints", (e) => {
        var blueName = document.getElementById('blueTeamName');
        var blueImg = document.getElementById('blueImg');;
        blueName.innerHTML = "The Saints";
        blueImg.src = "Images/the_saints_no_text.png";
    });

    WsSubscribers.subscribe("Team", "orangeCeltic", (e) => {
        var orangeName = document.getElementById('orangeTeamName');
        var orangeImg = document.getElementById('orangeImg');;
        orangeName.innerHTML = "Celtic Tigers";
        orangeImg.src = "Images/celtic_tigers_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeWolf", (e) => {
        var orangeName = document.getElementById('orangeTeamName');
        var orangeImg = document.getElementById('orangeImg');;
        orangeName.innerHTML = "Wolfhounds";
        orangeImg.src = "Images/irish_wolfhounds_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeBanshee", (e) => {
        var orangeName = document.getElementById('orangeTeamName');
        var orangeImg = document.getElementById('orangeImg');;
        orangeName.innerHTML = "Banshees";
        orangeImg.src = "Images/the_banshees_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeKings", (e) => {
        var orangeName = document.getElementById('orangeTeamName');
        var orangeImg = document.getElementById('orangeImg');;
        orangeName.innerHTML = "High Kings";
        orangeImg.src = "Images/the_high_kings_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeSetanta", (e) => {
        var orangeName = document.getElementById('orangeTeamName');
        var orangeImg = document.getElementById('orangeImg');;
        orangeName.innerHTML = "Setanta";
        orangeImg.src = "Images/setanta_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeSaints", (e) => {
        var orangeName = document.getElementById('orangeTeamName');
        var orangeImg = document.getElementById('orangeImg');;
        orangeName.innerHTML = "The Saints";
        orangeImg.src = "Images/the_saints_no_text.png";
    });
    WsSubscribers.subscribe("Scoreboard", "Names", (e) => {
        autoNames = e;
    });

});
