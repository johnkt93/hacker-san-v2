import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class YouTubeChannel {
    @PrimaryColumn()
    channelId: string;

    @Column()
    channelName: string;
}