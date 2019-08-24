import { Message, Guild, GuildMember } from 'discord.js';
import { commandInterface } from '../../commands';
import { permLevels } from '../../utils/permissions';
import { Bot } from '../..';
import { sendError } from '../../utils/messages';
import { permToString, durationToString, stringToMember } from '../../utils/parsers';
import { durations } from '../../utils/time';
import { caseActionsArray } from '../../database/schemas';

var command: commandInterface = {
    name: 'casedelete',
    path: '',
    dm: false,
    permLevel: permLevels.mod,
    togglable: false,
    cooldownLocal: durations.second,
    shortHelp: 'Delete cases from the Database',
    embedHelp: async function (guild: Guild) {
        let prefix = await Bot.database.getPrefix(guild);
        return {
            'embed': {
                'color': Bot.database.settingsDB.cache.embedColors.help,
                'author': {
                    'name': 'Command: ' + prefix + command.name
                },
                'fields': [
                    {
                        'name': 'Description:',
                        'value': 'Let\'s you delete cases from the database'
                    },
                    {
                        'name': 'Types:',
                        'value': caseActionsArray.join(', ')
                    },
                    {
                        'name': 'Need to be:',
                        'value': permToString(command.permLevel),
                        'inline': true
                    },
                    {
                        'name': 'DM capable:',
                        'value': command.dm,
                        'inline': true
                    },
                    {
                        'name': 'Togglable:',
                        'value': command.togglable,
                        'inline': true
                    },
                    {
                        'name': 'Local Cooldown:',
                        'value': durationToString(command.cooldownLocal),
                        'inline': true
                    },
                    {
                        'name': 'Usage:',
                        'value': '{command} [case id]\n{command} user [user]\n{command} user [user] [type]\n{command} [type]'.replace(/\{command\}/g, prefix + command.name)
                    },
                    {
                        'name': 'Example:',
                        'value': '{command} 23\n{command} user @jeff#1234 \n{command} warn'.replace(/\{command\}/g, prefix + command.name)
                    }
                ]
            }
        }
    },
    run: async (message: Message, args: string, permLevel: number, dm: boolean, requestTime: [number, number]) => {
        try {
            if (args.length == 0) {
                message.channel.send(await command.embedHelp(message.guild));
                Bot.mStats.logMessageSend();
                return false;
            }

            if (!isNaN(parseInt(args))) {
                let caseID = parseInt(args);
                if (!await Bot.caseLogger.deleteCase(message.guild.id, caseID)) {
                    message.channel.send('Please provide a valid case ID');
                    Bot.mStats.logMessageSend();
                    return false;
                }
                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`:white_check_mark: **Case ${caseID} has been deleted**`);
                Bot.mStats.logMessageSend();
                Bot.mStats.logCommandUsage(command.name, 'id');
            } else {
                let argIndex = 0;
                let argsArray = args.split(' ').filter(x => x.length != 0);

                let userID: string;
                if (argsArray[argIndex] == 'user') {
                    argIndex++;
                    if (!argsArray[argIndex]) {
                        message.channel.send('Please specify a user');
                        Bot.mStats.logMessageSend();
                        return false;
                    }
                    let member = await stringToMember(message.guild, argsArray[argIndex], false, false, false);
                    if (member) {
                        userID = member.id;
                    } else {
                        userID = argsArray[argIndex];
                    }
                    argIndex++;
                }

                let type: string;
                if (argsArray[argIndex]) {
                    if (!caseActionsArray.includes(argsArray[argIndex])) {
                        message.channel.send('Invalid Type. Use one of the following:\n' + caseActionsArray.join(', '));
                        Bot.mStats.logMessageSend();
                        return false;
                    } else {
                        type = argsArray[argIndex]
                        argIndex++;
                    }
                } else if (!userID) {
                    message.channel.send('Please provide one of the following types:\n' + caseActionsArray.join(', '));
                    Bot.mStats.logMessageSend();
                    return false;
                }

                let query: any = { guild: message.guild.id };
                if (userID) query.user = userID;
                if (type) query.action = type;

                let result = await Bot.caseLogger.cases.deleteMany(query).exec();

                Bot.mStats.logResponseTime(command.name, requestTime);
                message.channel.send(`:white_check_mark: **Successfully deleted ${result.n} ${type ? type+' ' : ''}case${result.n ? 's' : ''}${userID ? ` from <@${userID}` : ''}>**`);
                Bot.mStats.logMessageSend();
                Bot.mStats.logCommandUsage(command.name, 'id');
            }
            return true;
        } catch (e) {
            sendError(message.channel, e);
            Bot.mStats.logError(e, command.name);
            return false;
        }
    }
};

export default command;