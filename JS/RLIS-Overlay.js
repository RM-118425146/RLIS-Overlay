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


$(() => {
	WsSubscribers.init(49322, true)
	WsSubscribers.subscribe("game", "update_state", (d) => {
	    var blueName = d['game']['teams'][0]['name'];
	    var orangeName = d['game']['teams'][1]['name'];
		$(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-top .overlay-full-score-area .overlay-blue-scoreboard-area .overlay-blue-team-name-area .overlay-blue-team-name").text(blueName);
		$(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-top .overlay-full-score-area .overlay-blue-scoreboard-area .overlay-blue-score-area .overlay-blue-score").text(d['game']['teams'][0]['score']);
		$(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-top .overlay-full-score-area .overlay-orange-scoreboard-area .overlay-orange-team-name-area .overlay-orange-team-name").text(orangeName);
		$(".overlay-container .overlay-overlay-top .overlay-scoreboard .overlay-scoreboard-top .overlay-full-score-area .overlay-orange-scoreboard-area .overlay-orange-score-area .overlay-orange-score").text(d['game']['teams'][1]['score']);

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
		let activeBlue = "linear-gradient(to left, #0074f0 40%, #003EB3)";
		let inactiveBlue = "#0074f0";
		let activeOrange = "linear-gradient(to left, #ff5000 60%, #ff6904)";
		let inactiveOrange = "#ff6904";

		var target = d['game']['target'];
        if(target != "" && d['game']['isReplay'] == false){
            orangePlayer1.style.visibility = 'visible';
            orangePlayer2.style.visibility = 'visible';
            orangePlayer3.style.visibility = 'visible';
            bluePlayer1.style.visibility = 'visible';
            bluePlayer2.style.visibility = 'visible';
            bluePlayer3.style.visibility = 'visible';
        }else{
            orangePlayer1.style.visibility = 'hidden';
            orangePlayer2.style.visibility = 'hidden';
            orangePlayer3.style.visibility = 'hidden';
            orangePlayer1.style.background = inactiveOrange;
            orangePlayer2.style.background = inactiveOrange;
            orangePlayer3.style.background = inactiveOrange;
            bluePlayer1.style.visibility = 'hidden';
            bluePlayer2.style.visibility = 'hidden';
            bluePlayer3.style.visibility = 'hidden';
            bluePlayer1.style.background = inactiveBlue;
            bluePlayer2.style.background = inactiveBlue;
            bluePlayer3.style.background = inactiveBlue;
        }

		Object.keys(d['players']).forEach((id) => {
		    if(d['players'][id].team == 0){
		        blueMembers += 1;
		        var gradientAmount = "linear-gradient(to right, orange " + d['players'][id].boost + "% , #595959 0% 100%)";
		        $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-info-area-" + blueMembers +"  .overlay-blue-name-" + blueMembers +" .overlay-blue-name-" + blueMembers +"-text").text(d['players'][id].name);
		        $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-info-area-" + blueMembers +"  .overlay-blue-stats-" + blueMembers +" .overlay-blue-goals-" + blueMembers +" .overlay-blue-goals-amount-" + blueMembers).text(d['players'][id].goals);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-info-area-" + blueMembers +"  .overlay-blue-stats-" + blueMembers +" .overlay-blue-shots-" + blueMembers +" .overlay-blue-shots-amount-" + blueMembers).text(d['players'][id].shots);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-info-area-" + blueMembers +"  .overlay-blue-stats-" + blueMembers +" .overlay-blue-assists-" + blueMembers +" .overlay-blue-assists-amount-" + blueMembers).text(d['players'][id].assists);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-info-area-" + blueMembers +"  .overlay-blue-stats-" + blueMembers +" .overlay-blue-saves-" + blueMembers +" .overlay-blue-saves-amount-" + blueMembers).text(d['players'][id].saves);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-blue-names .overlay-blue-name-" + blueMembers + "-area .overlay-blue-boost-area-" + blueMembers +" .overlay-blue-boost-amount-" + blueMembers).text(d['players'][id].boost);

		        if(blueMembers == 1){
		            bluePlayerBoost1.style.background = gradientAmount;
		        }else if(blueMembers == 2){
		            bluePlayerBoost2.style.background = gradientAmount;
		        }else if(blueMembers == 3){
		            bluePlayerBoost3.style.background = gradientAmount;
		        }

		        if (d['players'][id].id == d['game']['target']) {
		            orangePlayer1.style.background = inactiveOrange;
		            orangePlayer2.style.background = inactiveOrange;
		            orangePlayer3.style.background = inactiveOrange;
		            if((blueMembers - 3) == 0){
		                bluePlayer3.style.background = activeBlue;
		                console.log(activeBlue);
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
		        }
		    }else if(d['players'][id].team == 1){
                orangeMembers += 1;
                var gradientAmount = "linear-gradient(to right, #595959 " + (100 - d['players'][id].boost) + "%, orange 0% 100% )";
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-info-area-" + orangeMembers +"  .overlay-orange-name-" + orangeMembers +" .overlay-orange-name-" + orangeMembers +"-text").text(d['players'][id].name);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-info-area-" + orangeMembers +"  .overlay-orange-stats-" + orangeMembers +" .overlay-orange-goals-" + orangeMembers +" .overlay-orange-goals-amount-" + orangeMembers).text(d['players'][id].goals);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-info-area-" + orangeMembers +"  .overlay-orange-stats-" + orangeMembers +" .overlay-orange-shots-" + orangeMembers +" .overlay-orange-shots-amount-" + orangeMembers).text(d['players'][id].shots);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-info-area-" + orangeMembers +"  .overlay-orange-stats-" + orangeMembers +" .overlay-orange-assists-" + orangeMembers +" .overlay-orange-assists-amount-" + orangeMembers).text(d['players'][id].assists);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-info-area-" + orangeMembers +"  .overlay-orange-stats-" + orangeMembers +" .overlay-orange-saves-" + orangeMembers +" .overlay-orange-saves-amount-" + orangeMembers).text(d['players'][id].saves);
                $(".overlay-container .overlay-overlay-middle .overlay-name-info-area .overlay-orange-names .overlay-orange-name-" + orangeMembers + "-area .overlay-orange-boost-area-" + orangeMembers +" .overlay-orange-boost-amount-" + orangeMembers).text(d['players'][id].boost);

		        if(orangeMembers == 1){
                    orangePlayerBoost1.style.background = gradientAmount;
                }else if(orangeMembers == 2){
                    orangePlayerBoost2.style.background = gradientAmount;
                }else if(orangeMembers == 3){
                    orangePlayerBoost3.style.background = gradientAmount;
                }

                if (d['players'][id].id == d['game']['target']) {
                    bluePlayer1.style.background = inactiveBlue;
                    bluePlayer2.style.background = inactiveBlue;
                    bluePlayer3.style.background = inactiveBlue;
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
                }
		    }
        });

	});

	WsSubscribers.subscribe("game", "goal_scored", (e) => {
    	  $(".overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-scored-by-area .overlay-scored-by-player-name").text(e['scorer']['name']);
          if(e['assister']['name'] == ""){
            $(".overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-assist-area .overlay-assist-player-name").text("None");
          }else{
            $(".overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-assist-area .overlay-assist-player-name").text(e['assister']['name']);
          }
          var goalSpeed = Math.round(e['goalspeed']) + " KM/H";
          $(".overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-speed-area .overlay-speed-value").text(goalSpeed);
    });

	WsSubscribers.subscribe("game", "replay_start", (e) => {
        let replayBanner = document.getElementById("replayBanner");
        replayBanner.style.visibility = 'visible';
    });

    WsSubscribers.subscribe("game", "replay_end", (e) => {
        let replayBanner = document.getElementById("replayBanner");
        replayBanner.style.visibility = 'hidden'
    });

});