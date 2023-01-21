import { Audio } from "expo-av";
import { storeAudioForNextOpening } from "./helper";

// play audio
export const play = async (playbackObj, uri, lastPosition) => {
  try {
    if (!lastPosition)
      return await playbackObj.loadAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 1000 }
      );

    // but if there is lastPosition then we will play audio from the lastPosition
    await playbackObj.loadAsync(
      { uri },
      { progressUpdateIntervalMillis: 1000 }
    );

    return await playbackObj.playFromPositionAsync(lastPosition);
  } catch (error) {
    console.log("error inside play helper method", error.message);
  }
};

// pause audio
export const pause = async (playbackObj) => {
  try {
    return await playbackObj.setStatusAsync({
      shouldPlay: false
    });
  } catch (error) {
    console.log("error inside pause helper method", error.message);
  }
};

// resume audio
export const resume = async (playbackObj) => {
  try {
    return await playbackObj.playAsync();
  } catch (error) {
    console.log("error inside resume helper method", error.message);
  }
};

// select another audio
export const playNext = async (playbackObj, uri) => {
  try {
    await playbackObj.stopAsync();
    await playbackObj.unloadAsync();
    return await play(playbackObj, uri);
  } catch (error) {
    console.log("error inside playNext helper method", error.message);
  }
};

export const selectAudio = async (audio, context, playListInfo = {}) => {
  const {
    soundObj,
    playbackObj,
    currentAudio,
    audioFiles,
    onPlaybackStatusUpdate,
    setCurrentAudio,
    setCurrentAudioIndex,
    setSoundObj,
    setIsPlaying,
    setIsPlayListRunning,
    setActivePlayList,
    setPlaybackPosition
  } = context;
  try {
    console.log("soundObj", soundObj);
    // playing audio for the first time.
    if (soundObj === null) {
      const status = await play(playbackObj, audio.uri, audio.lastPosition);
      const index = audioFiles.findIndex(({ id }) => id === audio.id);
      setCurrentAudio(audio);
      setSoundObj(status);
      setIsPlaying(true);
      setCurrentAudioIndex(index);
      setIsPlayListRunning(false);
      setActivePlayList([]);
      if (playListInfo.activePlayList) {
        setActivePlayList(playListInfo.activePlayList);
      }
      if (playListInfo.isPlayListRunning) {
        setIsPlayListRunning(playListInfo.isPlayListRunning);
      }

      playbackObj.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      return storeAudioForNextOpening(audio, index);
    }

    // pause audio
    if (
      soundObj.isLoaded &&
      soundObj.isPlaying &&
      currentAudio.id === audio.id
    ) {
      const status = await pause(playbackObj);
      setSoundObj(status);
      setIsPlaying(false);
      setPlaybackPosition(status.positionMillis);
    }

    // resume audio
    if (
      soundObj.isLoaded &&
      !soundObj.isPlaying &&
      currentAudio.id === audio.id
    ) {
      const status = await resume(playbackObj);
      setSoundObj(status);
      setIsPlaying(true);
    }

    // select another audio
    if (soundObj.isLoaded && currentAudio.id !== audio.id) {
      const status = await playNext(playbackObj, audio.uri);
      const index = audioFiles.findIndex(({ id }) => id === audio.id);
      setCurrentAudio(audio);
      setSoundObj(status);
      setIsPlaying(true);
      setCurrentAudioIndex(index);
      setIsPlayListRunning(false);
      setActivePlayList([]);
      if (playListInfo.activePlayList) {
        setActivePlayList(playListInfo.activePlayList);
      }
      if (playListInfo.isPlayListRunning) {
        setIsPlayListRunning(playListInfo.isPlayListRunning);
      }
      return storeAudioForNextOpening(audio, index);
    }
  } catch (error) {
    console.log("Error selecting audio: ", error);
  }
};

const selectAudioFromPlayList = async (context, select) => {
  const { activePlayList, currentAudio, audioFiles, playbackObj } = context;
  let audio;
  let defaultIndex;
  let nextIndex;

  const indexOnPlayList = activePlayList.audios.findIndex(
    ({ id }) => id === currentAudio.id
  );

  if (select === "next") {
    nextIndex = indexOnPlayList + 1;
    defaultIndex = 0;
  }

  if (select === "previous") {
    nextIndex = indexOnPlayList - 1;
    defaultIndex = activePlayList.audios.length - 1;
  }
  audio = activePlayList.audios[nextIndex];

  if (!audio) audio = activePlayList.audios[defaultIndex];

  const indexOnAllList = audioFiles.findIndex(({ id }) => id === audio.id);

  const status = await playNext(playbackObj, audio.uri);
  setSoundObj(status);
  setIsPlaying(true);
  setCurrentAudio(audio);
  setCurrentAudioIndex(indexOnAllList);
};

export const changeAudio = async (context, select) => {
  const {
    playbackObj,
    currentAudioIndex,
    totalAudioCount,
    audioFiles,
    isPlayListRunning,
    onPlaybackStatusUpdate,
    setPlaybackPosition,
    setPlaybackDuration,
    setCurrentAudio,
    setSoundObj,
    setIsPlaying,
    setCurrentAudioIndex
  } = context;

  if (isPlayListRunning) return selectAudioFromPlayList(context, select);

  try {
    const { isLoaded } = await playbackObj.getStatusAsync();
    const isLastAudio = currentAudioIndex + 1 === totalAudioCount;
    const isFirstAudio = currentAudioIndex <= 0;
    let audio;
    let index;
    let status;

    // for next
    if (select === "next") {
      audio = audioFiles[currentAudioIndex + 1];
      if (!isLoaded && !isLastAudio) {
        index = currentAudioIndex + 1;
        status = await play(playbackObj, audio.uri);
        playbackObj.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      }

      if (isLoaded && !isLastAudio) {
        index = currentAudioIndex + 1;
        status = await playNext(playbackObj, audio.uri);
      }

      if (isLastAudio) {
        index = 0;
        audio = audioFiles[index];
        if (isLoaded) {
          status = await playNext(playbackObj, audio.uri);
        } else {
          status = await play(playbackObj, audio.uri);
        }
      }
    }

    // for previous
    if (select === "previous") {
      audio = audioFiles[currentAudioIndex - 1];
      if (!isLoaded && !isFirstAudio) {
        index = currentAudioIndex - 1;
        status = await play(playbackObj, audio.uri);
        playbackObj.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      }

      if (isLoaded && !isFirstAudio) {
        index = currentAudioIndex - 1;
        status = await playNext(playbackObj, audio.uri);
      }

      if (isFirstAudio) {
        index = totalAudioCount - 1;
        audio = audioFiles[index];
        if (isLoaded) {
          status = await playNext(playbackObj, audio.uri);
        } else {
          status = await play(playbackObj, audio.uri);
        }
      }
    }

    // select another audio
    setCurrentAudio(audio);
    setSoundObj(status);
    setIsPlaying(true);
    setCurrentAudioIndex(index);
    setPlaybackPosition(null);
    setPlaybackDuration(null);
    storeAudioForNextOpening(audio, index);
  } catch (error) {
    console.log("error inside change audio method.", error.message);
  }
};

export const moveAudio = async (context, value) => {
  const { soundObj, isPlaying, playbackObj, setPlaybackPosition, setSoundObj } =
    context;
  if (soundObj === null || !isPlaying) return;

  try {
    const status = await playbackObj.setPositionAsync(
      Math.floor(soundObj.durationMillis * value)
    );
    setSoundObj(status);
    setPlaybackPosition(status.positionMillis);

    await resume(playbackObj);
  } catch (error) {
    console.log("error inside onSlidingComplete callback", error);
  }
};
