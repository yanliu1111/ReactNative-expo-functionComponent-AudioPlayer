import React, { useContext, useEffect, useState } from "react";
import { Text, View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { RecyclerListView, LayoutProvider } from "recyclerlistview";
import AudioListItem from "../components/AudioListItem";
import Screen from "../components/Screen";
import OptionModal from "../components/OptionModal";
import { selectAudio } from "../misc/audioController";
import { AudioContext } from "../context/AudioProvider";

export default function AudioList(props) {
  const context = useContext(AudioContext);
  const [optionModalVisible, setOptionModalVisible] = useState(false);
  let currentItem = {};

  const layoutProvider = new LayoutProvider(
    (i) => "audio",
    (type, dim) => {
      switch (type) {
        case "audio":
          dim.width = Dimensions.get("window").width;
          dim.height = 70;
          break;
        default:
          dim.width = 0;
          dim.height = 0;
      }
    }
  );

  const handleAudioPress = async (audio) => {
    await selectAudio(audio, context);
  };

  useEffect(() => {
    context.loadPreviousAudio();
  }, []);

  const rowRenderer = (type, item, index, extendedState) => (
      <AudioListItem
        title={item.filename}
        isPlaying={extendedState.isPlaying}
        activeListItem={context.currentAudioIndex === index}
        duration={item.duration}
        onAudioPress={() => handleAudioPress(item)}
        onOptionPress={() => {
          currentItem = item;
          setOptionModalVisible(true);
        }}
      />
    );
  const navigateToPlaylist = () => {
    context.setAddToPlayList(currentItem),
      props.navigation.navigate("PlayList");
  };

  return (
    <AudioContext.Consumer>
      {({ dataProvider, isPlaying }) => {
        if (!dataProvider._data.length) return null;
        return (
          <Screen>
            <RecyclerListView
              dataProvider={dataProvider}
              layoutProvider={layoutProvider}
              rowRenderer={rowRenderer}
              extendedState={{ isPlaying }}
            />
            <OptionModal
              options={[
                {
                  title: "Add to playlist",
                  onPress: navigateToPlaylist
                }
              ]}
              currentItem={currentItem}
              onClose={() => setOptionModalVisible(false)}
              visible={optionModalVisible}
            />
          </Screen>
        );
      }}
    </AudioContext.Consumer>
  );
}
