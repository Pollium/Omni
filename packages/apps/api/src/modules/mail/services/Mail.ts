import MailQueue from '../queues/Mail';
import { MailMessage } from '../contracts/mail';

const mails = new MailQueue();

export default class Mail{
    send(message: MailMessage){
        return mails.add(message);
    }
}
