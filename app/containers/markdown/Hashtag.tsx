import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { themes } from '../../lib/constants';
import { useTheme } from '../../theme';
import { IUserChannel } from './interfaces';
import styles from './styles';
import { getSubscriptionByRoomId } from '../../lib/database/services/Subscription';
import { ChatsStackParamList } from '../../stacks/types';
import Navigation from '../../lib/navigation/appNavigation';
import { useAppSelector } from '../../lib/hooks';

interface IHashtag {
	hashtag: string;
	navToRoomInfo?: Function;
	style?: StyleProp<TextStyle>[];
	channels?: IUserChannel[];
}

const Hashtag = React.memo(({ hashtag, channels, navToRoomInfo, style = [] }: IHashtag) => {
	const { theme } = useTheme();
	const isMasterDetail = useAppSelector(state => state.app.isMasterDetail);
	const navigation = useNavigation<StackNavigationProp<ChatsStackParamList, 'RoomView'>>();

	const handlePress = async () => {
		const index = channels?.findIndex(channel => channel.name === hashtag);
		if (typeof index !== 'undefined' && navToRoomInfo) {
			const navParam = {
				t: 'c',
				rid: channels?.[index]._id
			};
			const room = navParam.rid && (await getSubscriptionByRoomId(navParam.rid));
			if (room) {
				if (isMasterDetail) {
					// Close the modal if it is open and then redirect to the channel
					Navigation.navigate('DrawerNavigator');
					navigation.replace('RoomView', room);
				} else navigation.push('RoomView', room);
			} else {
				navToRoomInfo(navParam);
			}
		}
	};

	if (channels && channels.length && channels.findIndex(channel => channel.name === hashtag) !== -1) {
		return (
			<Text
				style={[
					styles.mention,
					{
						color: themes[theme].mentionOtherColor
					},
					...style
				]}
				onPress={handlePress}>
				{`#${hashtag}`}
			</Text>
		);
	}
	return <Text style={[styles.text, { color: themes[theme].bodyText }, ...style]}>{`#${hashtag}`}</Text>;
});

export default Hashtag;
