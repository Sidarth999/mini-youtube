import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    // TODO: toggle subscription

    if (!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channelId")
    }

    const isSubscribed = await Subscription.findOne({
        channel : channelId,
        user : req.user?._id
    })
    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id)

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {subscribed: false},
                "Unsubscribed Successfully"
            )
        )
    }

    await Subscription.create({
        channel: channelId,
        subscriber: req.user?._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {subscribed: true},
            "Subscribed Successfully"
        )
    )
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel Id")
    }

    channelId = new mongoose.Types.ObjectId(channelId)

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel : channelId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber",
                        }
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber:{
                                $cond: {
                                    $if :{
                                        $in: [channelId,"$subscribedToSubscriber"]   
                                    },
                                    then: true,
                                    else: false
                                }
                            },
                            subscribersCount: {
                                $size: "$subscribedToSubscriber"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                _id: 0,
                subscriber: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    subscribedToSubscriber: 1,
                    subscribersCount: 1
                }
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscribers,
            "Subscribers fetched successfully"
        )
    )
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid subscriber Id")
    }

    subscriberId = new mongoose.Types.ObjectId(subscriberId)

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: subscriberId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos"
                        }
                    },
                    {
                        $addFields: {
                            latestVideo: {
                                $last: "$videos"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscribedChannel"
        },
        {
            $project: {
                _id: 0,
                subscribedChannel: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    latestVideo: {
                        _id: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1
                    }
                }
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscribedChannels,
            "Subscribed Channels fetched successfully"
        )
    )
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
