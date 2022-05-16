import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import { setUser } from '../actions/login';
import * as HeaderButton from '../containers/HeaderButton';
import * as List from '../containers/List';
import Loading from '../containers/Loading';
import SafeAreaView from '../containers/SafeAreaView';
import Status from '../containers/Status/Status';
import TextInput from '../containers/TextInput';
import { LISTENER } from '../containers/Toast';
import { IApplicationState, IBaseScreen, IUser, TUserStatus } from '../definitions';
import I18n from '../i18n';
import { Services } from '../lib/services';
import { getUserSelector } from '../selectors/login';
import { withTheme } from '../theme';
import EventEmitter from '../utils/events';
import { showErrorAlert } from '../utils/info';
import log, { events, logEvent } from '../utils/log';

interface IStatus {
	id: TUserStatus;
	name: string;
}

const STATUS: IStatus[] = [
	{
		id: 'online',
		name: 'Online'
	},
	{
		id: 'busy',
		name: 'Busy'
	},
	{
		id: 'away',
		name: 'Away'
	},
	{
		id: 'offline',
		name: 'Invisible'
	}
];

const styles = StyleSheet.create({
	inputContainer: {
		marginTop: 32,
		marginBottom: 32
	},
	inputLeft: {
		position: 'absolute',
		top: 12,
		left: 12
	},
	inputStyle: {
		paddingLeft: 48
	}
});

interface IStatusViewState {
	statusText: string;
	status: TUserStatus;
	loading: boolean;
}

interface IStatusViewProps extends IBaseScreen<any, 'StatusView'> {
	user: IUser;
	isMasterDetail: boolean;
	Accounts_AllowInvisibleStatusOption: boolean;
}

class StatusView extends React.Component<IStatusViewProps, IStatusViewState> {
	constructor(props: IStatusViewProps) {
		super(props);
		const { statusText, status } = props.user;
		this.state = { statusText: statusText || '', loading: false, status };
		this.setHeader();
	}

	setHeader = () => {
		const { navigation, isMasterDetail } = this.props;
		navigation.setOptions({
			title: I18n.t('Edit_Status'),
			headerLeft: isMasterDetail ? undefined : () => <HeaderButton.CancelModal onPress={this.close} />,
			headerRight: () => (
				<HeaderButton.Container>
					<HeaderButton.Item title={I18n.t('Done')} onPress={this.submit} testID='status-view-submit' />
				</HeaderButton.Container>
			)
		});
	};

	submit = async () => {
		logEvent(events.STATUS_DONE);
		const { statusText, status } = this.state;
		const { dispatch, user } = this.props;
		if (statusText !== user.statusText || status !== user.status) {
			this.setState({ loading: true });
			try {
				const result = await Services.setUserStatus(status, statusText);
				if (result.success) {
					dispatch(
						setUser({
							...(statusText !== user.statusText && { statusText }),
							...(status !== user.status && { status })
						})
					);

					EventEmitter.emit(LISTENER, { message: I18n.t('Status_saved_successfully') });
				}
			} catch (e: any) {
				const messageError =
					e.data && e.data.error.includes('[error-too-many-requests]')
						? I18n.t('error-too-many-requests', { seconds: e.data.error.replace(/\D/g, '') })
						: e.data.errorType;
				showErrorAlert(messageError);
				log(e);
				EventEmitter.emit(LISTENER, { message: I18n.t('error-could-not-change-status') });
			}
		}
		this.setState({ loading: false });
		this.close();
	};

	close = () => {
		const { navigation } = this.props;
		navigation.goBack();
	};

	renderHeader = () => {
		const { statusText, status } = this.state;
		const { user, theme } = this.props;

		return (
			<>
				<TextInput
					theme={theme}
					value={statusText}
					containerStyle={styles.inputContainer}
					onChangeText={text => {
						logEvent(events.STATUS_CUSTOM);
						this.setState({ statusText: text });
					}}
					left={<Status testID={`status-view-current-${user.status}`} style={styles.inputLeft} status={status} size={24} />}
					inputStyle={styles.inputStyle}
					placeholder={I18n.t('What_are_you_doing_right_now')}
					testID='status-view-input'
				/>
				<List.Separator />
			</>
		);
	};

	renderItem = ({ item }: { item: { id: TUserStatus; name: string } }) => {
		const { id, name } = item;
		return (
			<List.Item
				title={name}
				onPress={() => {
					// @ts-ignore
					logEvent(events[`STATUS_${item.id.toUpperCase()}`]);
					this.setState({ status: item.id });
				}}
				testID={`status-view-${id}`}
				left={() => <Status size={24} status={item.id} />}
			/>
		);
	};

	render() {
		const { loading } = this.state;
		const { Accounts_AllowInvisibleStatusOption } = this.props;

		const status = Accounts_AllowInvisibleStatusOption ? STATUS : STATUS.filter(s => s.id !== 'offline');

		return (
			<SafeAreaView testID='status-view'>
				<FlatList
					data={status}
					keyExtractor={item => item.id}
					renderItem={this.renderItem}
					ListHeaderComponent={this.renderHeader}
					ListFooterComponent={List.Separator}
					ItemSeparatorComponent={List.Separator}
				/>
				<Loading visible={loading} />
			</SafeAreaView>
		);
	}
}

const mapStateToProps = (state: IApplicationState) => ({
	user: getUserSelector(state),
	isMasterDetail: state.app.isMasterDetail,
	Accounts_AllowInvisibleStatusOption: (state.settings.Accounts_AllowInvisibleStatusOption as boolean) ?? true
});

export default connect(mapStateToProps)(withTheme(StatusView));
