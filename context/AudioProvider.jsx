import React, { useState, useEffect, createContext } from "react";
import { Text, View, Alert } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { DataProvider } from "recyclerlistview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { storeAudioForNextOpening } from "../misc/helper";
import { playNext, selectAudioFromPlayList } from "../misc/audioController";

export const AudioContext = createContext();

export const AudioProvider = (props) => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [playList, setPlayList] = useState([]);
  const [addToPlayList, setAddToPlayList] = useState(null);
  const [permissionError, setPermissionError] = useState(false);
  const [dataProvider, setDataProvider] = useState(
    new DataProvider((r1, r2) => r1 !== r2)
  );
  const [playbackObj, setPlaybackObj] = useState(null);
  const [soundObj, setSoundObj] = useState(null);
  const [currentAudio, setCurrentAudio] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayListRunning, setIsPlayListRunning] = useState(false);
  const [activePlayList, setActivePlayList] = useState([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(null);
  const [playbackPosition, setPlaybackPosition] = useState(null);
  const [playbackDuration, setPlaybackDuration] = useState(null);
  let totalAudioCount = 0;

  useEffect(() => {
    permissionAllert();
  }, []);

  const permissionAllert = () => {
    Alert.alert("Permission Required", "This app needs to read audio files!", [
      {
        text: "I am ready",
        onPress: () => getPermission()
      },
      {
        text: "cancle",
        onPress: () => permissionAllert()
      }
    ]);
  };

  const getAudioFiles = async () => {
    let media = await MediaLibrary.getAssetsAsync({
      mediaType: "audio"
    });
    media = await MediaLibrary.getAssetsAsync({
      mediaType: "audio",
      first: media.totalCount
    });
    totalAudioCount = media.totalCount;

    setDataProvider(
      dataProvider.cloneWithRows([...audioFiles, ...media.assets])
    );
    setAudioFiles([...audioFiles, ...media.assets]);
  };

  const loadPreviousAudio = async () => {
    let previousAudio = await AsyncStorage.getItem("previousAudio");
    let newAudio;
    let newAudioIndex;

    if (previousAudio === null) {
      newAudio = audioFiles[0];
      newAudioIndex = 0;
    } else {
      previousAudio = JSON.parse(previousAudio);
      newAudio = previousAudio.audio;
      newAudioIndex = previousAudio.index;
    }

    setCurrentAudio(newAudio);
    setCurrentAudioIndex(newAudioIndex);
  };

  const getPermission = async () => {
    const permission = await MediaLibrary.getPermissionsAsync();
    if (permission.granted) {
      getAudioFiles();
    }

    if (!permission.canAskAgain && !permission.granted) {
      setPermissionError(true);
    }

    if (!permission.granted && permission.canAskAgain) {
      const { status, canAskAgain } =
        await MediaLibrary.requestPermissionsAsync();
      if (status === "denied" && canAskAgain) {
        permissionAllert();
      }

      if (status === "granted") {
        getAudioFiles();
      }

      if (status === "denied" && !canAskAgain) {
        setPermissionError(true);
      }
    }
  };

  const onPlaybackStatusUpdate = async (playbackStatus) => {
    if (playbackStatus.isLoaded && playbackStatus.isPlaying) {
      setPlaybackPosition(playbackStatus.positionMillis);
      setPlaybackDuration(playbackStatus.durationMillis);
    }

    if (playbackStatus.isLoaded && !playbackStatus.isPlaying) {
      storeAudioForNextOpening(
        currentAudio,
        currentAudioIndex,
        playbackStatus.positionMillis
      );
    }

    if (playbackStatus.didJustFinish) {
      if (isPlayListRunning) {
        let audio;
        const indexOnPlayList = activePlayList.audios.findIndex(
          ({ id }) => id === currentAudio.id
        );
        const nextIndex = indexOnPlayList + 1;
        audio = activePlayList.audios[nextIndex];

        if (!audio) audio = activePlayList.audios[0];

        const indexOnAllList = audioFiles.findIndex(
          ({ id }) => id === audio.id
        );

        const status = await playNext(playbackObj, audio.uri);
        setSoundObj(status);
        setIsPlaying(true);
        setCurrentAudio(audio);
        setCurrentAudioIndex(indexOnAllList);
      }

      const nextAudioIndex = currentAudioIndex + 1;
      // there is no next audio to play or the current audio is the last
      if (nextAudioIndex >= totalAudioCount) {
        playbackObj.unloadAsync();
        setSoundObj(null);
        setCurrentAudio(audioFiles[0]);
        setIsPlaying(false);
        setCurrentAudioIndex(0);
        setPlaybackPosition(null);
        setPlaybackDuration(null);

        return await storeAudioForNextOpening(audioFiles[0], 0);
      }
      // otherwise we want to select the next audio
      const audio = audioFiles[nextAudioIndex];
      const status = await playNext(playbackObj, audio.uri);
      setSoundObj(status);
      setCurrentAudio(audio);
      setIsPlaying(true);
      setCurrentAudioIndex(nextAudioIndex);

      await storeAudioForNextOpening(audio, nextAudioIndex);
    }
  };

  useEffect(() => {
    getPermission();
    if (playbackObj === null) {
      setPlaybackObj(new Audio.Sound());
    }
  }, []);
  if (permissionError)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <Text style={{ fontSize: 25, textAlign: "center", color: "red" }}>
          It looks like you haven't accept the permission.
        </Text>
      </View>
    );
  return (
    <AudioContext.Provider
      value={{
        audioFiles,
        playList,
        setPlayList,
        addToPlayList,
        setAddToPlayList,
        dataProvider,
        playbackObj,
        soundObj,
        currentAudio,
        isPlaying,
        currentAudioIndex,
        totalAudioCount,
        playbackPosition,
        playbackDuration,
        isPlayListRunning,
        setIsPlayListRunning,
        activePlayList,
        setActivePlayList,
        loadPreviousAudio,
        onPlaybackStatusUpdate,
        setIsPlaying,
        setCurrentAudioIndex,
        setCurrentAudio,
        setSoundObj,
        setPlaybackPosition,
        setPlaybackDuration
      }}
    >
      {props.children}
    </AudioContext.Provider>
  );
};
