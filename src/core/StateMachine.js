const states = {
    LOBBY: 'LOBBY',
    NIGHT: 'NIGHT',
    PROCESS_NIGHT: 'PROCESS_NIGHT',
    DAY: 'DAY',
    VOTING: 'VOTING',
    PROCESS_VOTES: 'PROCESS_VOTES',
    CHECK_WIN: 'CHECK_WIN',
    GAME_OVER: 'GAME_OVER'
};

const transitions = {
    LOBBY: ['NIGHT'],
    NIGHT: ['PROCESS_NIGHT'],
    PROCESS_NIGHT: ['DAY', 'CHECK_WIN'],
    DAY: ['VOTING'],
    VOTING: ['PROCESS_VOTES'],
    PROCESS_VOTES: ['NIGHT', 'CHECK_WIN'],
    CHECK_WIN: ['NIGHT', 'GAME_OVER'],
    GAME_OVER: []
};

class StateMachine {
    static get states() { return states; }

    static isValidTransition(from, to) {
        const allowed = transitions[from];
        return allowed ? allowed.includes(to) : false;
    }
}

module.exports = StateMachine;
