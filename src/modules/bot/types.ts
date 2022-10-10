import { BotContact, BotMessage, BotRoom } from '../../models/bot';
import { OmitModel } from '../../types/utils.t';
import { MessageType } from 'wechaty-puppet/dist/esm/src/schemas/message';

/** 联系人信息 */
export type BotContactInfo = OmitModel<BotContact, 'botId'>;

/** 房间信息 */
export interface BotRoomInfo extends OmitModel<BotRoom, 'botId'> {
  member: BotContactInfo[];
}

/** 消息详情 */
export interface BotMessageInfo extends OmitModel<BotMessage> {
  form?: BotContactInfo;
}

/** 消息类型 */
export type MessageTypeOrMessageTypes = MessageType[] | MessageType;
