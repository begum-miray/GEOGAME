// Temporal countdown timer module with closure-encapsulated state

function createMissionTimer(initialSeconds = 60, callbacks = {}) {
  const { onTick = () => {}, onExpire = () => {} } = callbacks;

  let remainingSeconds = initialSeconds;
  let intervalId = null;
  let roundStartedAt = null;

  function clearTicker() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function startTicker() {
    clearTicker();
    roundStartedAt = Date.now();
    intervalId = setInterval(() => {
      remainingSeconds = Math.max(0, remainingSeconds - 1);
      onTick(remainingSeconds, initialSeconds);

      if (remainingSeconds <= 0) {
        clearTicker();
        onExpire();
      }
    }, 1000);
  }

  function start() {
    remainingSeconds = initialSeconds;
    onTick(remainingSeconds, initialSeconds);
    startTicker();
  }

  function pause() {
    clearTicker();
  }

  function resume() {
    if (remainingSeconds <= 0) return;
    startTicker();
  }

  function stop() {
    clearTicker();
  }

  function addBonusSeconds(seconds) {
    if (seconds <= 0 || remainingSeconds <= 0) return remainingSeconds;
    remainingSeconds = Math.min(initialSeconds, remainingSeconds + seconds);
    onTick(remainingSeconds, initialSeconds);
    return remainingSeconds;
  }

  function getRoundElapsedSeconds() {
    if (!roundStartedAt) return 0;
    return (Date.now() - roundStartedAt) / 1000;
  }

  function getRemainingSeconds() {
    return remainingSeconds;
  }

  return {
    start,
    pause,
    resume,
    stop,
    addBonusSeconds,
    getRoundElapsedSeconds,
    getRemainingSeconds,
  };
}
