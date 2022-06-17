import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CommandInteraction, GuildChannel, MessageEmbed, TextChannel, ThreadChannel } from "discord.js";
import { Repository } from "typeorm";
import { Action, Platform } from "../../models/action.entity";
import { ISlashCommand, SlashCommand } from "./slash-command";

function addShared(builder: SlashCommandSubcommandBuilder, before: (builder: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return before(builder)
        .addStringOption(platform => platform
            .setName("platform")
            .setDescription("The platform to listen for.")
            .setChoices(
                { name: "YouTube", value: "youtube" },
                { name: "Twitter", value: "twitter" }
            )
            .setRequired(true)
        )
        .addStringOption(event => event
            .setName("event")
            .setDescription("Which particular event to listen for.")
            .setChoices(                
                {name: "Upload", value: "upload"},
                {name: "Live", value: "live"},
                {name: "Upcoming", value: "upcoming"},
                {name: "Offline", value: "offline"},
                {name: "Post", value: "post"}
            )
            .setRequired(true)
        )
        .addStringOption(channel => channel
            .setName("channel")
            .setDescription("The channel. For YouTube, actual ID required.")
            .setRequired(true)
        )
        .addChannelOption(channel => channel
            .setName("for-channel")
            .setDescription("The channel to execute in. Defaults to this channel.")
            .setRequired(false)
        )
}

@SlashCommand({
    commandData: new SlashCommandBuilder()
        .setName("action")
        .setDescription("Manage actions")
        .addSubcommand(remove => remove
            .setName("remove")
            .setDescription("Remove an action.")
            .addStringOption(id => id
                .setName("action-id")
                .setDescription("The ID of the action to be deleted.")
                .setRequired(true)
            )
        )
        .addSubcommand(lock => addShared(lock, lock => lock
            .setName("lock")
            .setDescription("Lock or unlock this channel when the corresponding event is fired.")
            .addStringOption(mode => mode
                .setName("mode")
                .setDescription("Whether to lock or unlock the channel")
                .setChoices(
                    {name: "lock", value: "lock"}, 
                    {name: "unlock", value: "unlock"}
                )
                .setRequired(true)
            ))
        )
        .addSubcommand(rename => addShared(rename, rename => rename
            .setName("rename")
            .setDescription("Rename this channel when the corresponding event is fired.")
            .addStringOption(name => name
                .setName("name")
                .setDescription("The channel's new name")
                .setRequired(true)
            ))
        )
        .addSubcommand(echo => addShared(echo, echo => echo
            .setName("echo")
            .setDescription("Send a message in this channel when the corresponding event is fired.")
            .addStringOption(message => message
                .setName("message")
                .setDescription("The message to send. Supports certain variables. See /help event-vars for more.")
                .setRequired(true)
            ))
        )
        .addSubcommand(notify => addShared(notify, notify => notify
            .setName("notify")
            .setDescription("Send a notification in this channel when the corresponding event is fired.")
            .addStringOption(message => message
                .setName("message")
                .setDescription("A message to send on notification.")
                .setRequired(true)
            ))
        )
})
export class ActionCommand implements ISlashCommand {
    private readonly logger = new Logger(ActionCommand.name);

    constructor(
        @InjectRepository(Action) private readonly actionRepo: Repository<Action>
    ) {}

    private readonly actionMethods = {
        "lock": this.handleLock,
        "rename": this.handleRename,
        "echo": this.handleEcho,
        "notify": this.handleNotify,
        "remove": this.handleRemove,
    }
    
    async execute(interaction: CommandInteraction) {
        const subcommand = interaction.options.getSubcommand() as "remove" | "lock" | "rename" | "echo" | "notify";

        
        const dataOption: {data: any} | void = await this.actionMethods[subcommand](interaction);
        if (dataOption) {
            const options = await this.getBasicOptions(interaction);
            try {
                const action = await this.actionRepo.save({...options, ...dataOption});
                await interaction.reply({
                    embeds: [
                        new MessageEmbed().setDescription(`Added new callback with ID ${action.id}`).setColor("GREEN")
                    ]
                });
            } catch (error) {
                this.logger.error(error);
            }
        }
    }

    async getBasicOptions({options, channel: interactionChannel, guildId}: CommandInteraction): Promise<Partial<Action>> {
        const channelOption = options.getChannel("for-channel", false);
        const channel = (channelOption ?? interactionChannel) as TextChannel;

        const discordChannelId = channel.isThread() ? (channel as ThreadChannel).parentId : channel.id;   
        const discordThreadId = channel.isThread()? (channel as ThreadChannel).id : undefined;
        
        return {
            type: options.getSubcommand(),
            guildId,
            discordChannelId,
            discordThreadId,
            onEvent: options.getString("event"),
            platform: options.getString("platform") as Platform,
            channelId: options.getString("channel")
        }
    }

    handleLock({options}: CommandInteraction): {data: any} {
        return {
            data: {
                mode: options.getString("mode"),
            }
        }
    }

    handleRename({options}: CommandInteraction): {data: any} {
        return {
            data: {
                name: options.getString("name"),
            }
        }        
    }

    handleEcho({options}: CommandInteraction): {data: any} {
        return {
            data: {
                message: options.getString("message"),
            }
        }     
    }

    handleNotify({options}: CommandInteraction): {data: any} {
        return {
            data: {
                message: options.getString("message"),
            }
        }     
    }

    async handleRemove(interaction: CommandInteraction) {
        const id = interaction.options.getString("action-id");
        const action = await this.actionRepo.find({where: {id}});
        if (!action) return interaction.reply({embeds: [new MessageEmbed().setTitle("Could not remove Action").setDescription(`Could not find action with ID ${id}.`).setColor("RED")]});

        await this.actionRepo.remove(action);
        interaction.reply({embeds: [new MessageEmbed().setTitle("Removed Action").setDescription(`Removed action with ID ${id}.`)]});
    }
}