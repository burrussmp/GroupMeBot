const express = require('express')
require('dotenv').config()
const fetch = require("node-fetch");



const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const GROUPID = process.env.BETA_PI_ID;

const print_out_group_id = (token=ACCESS_TOKEN,group_name='Beta Plague Inc.') => {
    fetch(`https://api.groupme.com/v3/groups?token=${token}`)
        .then((res)=>{
            return res.json();
        }).then((data)=>{
            let groups = data.response;
            let beta_pi = groups.filter(group => group.name == group_name);
            console.log(beta_pi);
        })
}

const previousDayTimeStampBoundaries = () =>{
    let today = new Date();
    let yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate()-1);
    let year = yesterday.getFullYear();
    let day = yesterday.getDate();
    let month = yesterday.getMonth();
    let start_of_day_yesterday = new Date(Date.UTC(year,month,day,0,0,0,0));
    let end_of_day_yesterday = new Date(Date.UTC(year,month,day,23,59,59,999));
    return [start_of_day_yesterday,end_of_day_yesterday]
}

const get_num_digits = (number) => {
    return number.toString().length;
}

const convert_groupme_timestamp_to_date = (created_at) => {
    let num_digits = get_num_digits(created_at);
    let timestamp = created_at*(10**(13-num_digits));
    let date_of_message = new Date(timestamp);
    return date_of_message;
}
const filter_out_all_messages_from_yesterday = (messages) => {
    const [start,end] = previousDayTimeStampBoundaries();
    let messages_filtered = messages.filter(message => {
        let date_of_message = convert_groupme_timestamp_to_date(message.created_at);
        return date_of_message > start && date_of_message < end
    })
    return messages_filtered;
}

const getOldestMessage = (messages) => {
    let oldestDate = new Date();
    let oldestMessage = undefined;
    for (let i = 0; i < messages.length; ++i){
        let date_of_message = convert_groupme_timestamp_to_date(messages[i].created_at);
        if (date_of_message < oldestDate) {
            oldestDate = date_of_message;
            oldestMessage = messages[i];
        }
    }
    return oldestMessage;
}

const get_all_messages_yesterday = async (token=ACCESS_TOKEN,groupId=GROUPID) => {
    let collected_messages =[];
    let continue_looking_back = true
    let before_id = undefined;
    while (continue_looking_back){
        let url;
        if (before_id){
            url = `https://api.groupme.com/v3/groups/${groupId}/messages?token=${token}&limit=100&before_id=${before_id}`;
        } else {
            url = `https://api.groupme.com/v3/groups/${groupId}/messages?token=${token}&limit=100`;
        }
        await fetch(url)
            .then((res)=>{
                return res.json();
            }).then((data)=>{
                let messages = data.response.messages;
                let yesterday_messages = filter_out_all_messages_from_yesterday(messages);
                collected_messages = collected_messages.concat(yesterday_messages);
                if (yesterday_messages.length == 0){
                    continue_looking_back = false;
                } else {
                    let oldestMessage = getOldestMessage(yesterday_messages);
                    before_id = oldestMessage.id;
                }
            })
        }
    return collected_messages
}

const sort_messages_by_likes = (messages) => {
    const sort_by_likes = (x,y) => {
        let l1 = x.favorited_by.length;
        let l2 = y.favorited_by.length;
        if (l1 > l2){
            return -1;
        } else if (l1 < l2) {
            return 1;
        } else {
            return 0
        }
    }
    let sorted_messages = [...messages];
    sorted_messages.sort(sort_by_likes)
    return sorted_messages;
}

const get_top_k_liked_messages = (k=3,messages) => {
    let sorted_messages = sort_messages_by_likes(messages);
    return sorted_messages.slice(0,k);
}

const get_avg_likes_per_person = (k=3,messages) => {
    //let sorted_messages = sort_messages_by_likes(messages);
    let array_of_names = messages.map(message => message.name)
    array_of_names = array_of_names.filter((v, i, a) => a.indexOf(v) === i && v != 'GroupMe');
    let num_likes = new Array(array_of_names.length).fill(0);
    let num_messages = new Array(array_of_names.length).fill(0);
    for (let i = 0; i < messages.length; ++i){
        let idx = array_of_names.indexOf(messages[i].name);
        if (idx != -1){
            num_likes[idx] += messages[i].favorited_by.length;
            num_messages[idx] += 1;
        }
    }
    let likes_per_person = [];
    for (let i = 0; i < array_of_names.length;++i){
        likes_per_person.push({
            'name':array_of_names[i],
            'likes':num_likes[i],
            'num_messages':num_messages[i]
        })
    };

    likes_per_person = likes_per_person.map(obj => {
        let avg_likes = parseFloat((obj['likes'] / obj['num_messages']).toFixed(2));
        obj['avg_likes'] = avg_likes;
        return obj;
    })
    return likes_per_person;
}

const get_lowest_k_average = (k=3,avg_likes_per_person) => {
    const sort_by_avg_likes = (x,y) => {
        let l1 = x.avg_likes;
        let l2 = y.avg_likes;
        if (l1 > l2){
            return -1;
        } else if (l1 < l2) {
            return 1;
        } else {
            return 0
        }
    }
    let sorted_by_avg_likes = [...avg_likes_per_person];
    sorted_by_avg_likes.sort(sort_by_avg_likes);
    return sorted_by_avg_likes.splice(sorted_by_avg_likes.length-k,k).reverse()
}

const construct_congrats_message = (messages) =>{
    let response = `Congratulations to the following individuals for their GroupMe performance yesterday!:\n`
    for (let i = 0; i < messages.length; ++i){
        response += `${messages[i].name} for getting ${messages[i].favorited_by.length} likes\n`
    }
    return response;
}

const construct_not_congrats_message = (messages) =>{
    let response = `Also, condolences to the following individuals:\n`
    for (let i = 0; i < messages.length; ++i){
        response += `${messages[i].name} for averaging ${messages[i].avg_likes} likes on ${messages[i].num_messages} messages\n`;
    }
    return response;
}

const get_yesterday_statistics = async () => {
    let yesterday_messages = await get_all_messages_yesterday(ACCESS_TOKEN,GROUPID);
    let top_k_liked = get_top_k_liked_messages(k=3,yesterday_messages)
    let avg_likes_per_person = get_avg_likes_per_person(k=3,yesterday_messages);
    let bottom_k_avg = get_lowest_k_average(k=3,avg_likes_per_person);
    let congrats = construct_congrats_message(top_k_liked);
    let not_congrats = construct_not_congrats_message(bottom_k_avg);
    return [congrats,not_congrats]
}


const createUUID = () => {
    // http://www.ietf.org/rfc/rfc4122.txt
    let s = [];
    let hexDigits = "0123456789abcdef";
    for (let i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    let uuid = s.join("");
    return uuid;
}

const send_message_to_chat = async (token=ACCESS_TOKEN,groupId = GROUPID,message) => {
    let data = {
        "message" : {
            "source_guid": createUUID(),
            'text':message
        }
    };
    let url = `https://api.groupme.com/v3/groups/${groupId}/messages?token=${token}`
    await fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data) // body data type must match "Content-Type" header
      }).then((res)=>{
          return res.json();
      }).then((data)=>{
          console.log(data);
      }).catch((error)=>{
          console.log(`ERROR: ${error}`);
      });
}

const send_stats_to_beta_pi = async () => {
    const [congrats,not_congrats] = await get_yesterday_statistics();
    await send_message_to_chat(token=ACCESS_TOKEN,groupId=GROUPID,message='DAILY UPDATE\n'+congrats)
    await send_message_to_chat(token=ACCESS_TOKEN,groupId=GROUPID,message=not_congrats +'Emory still sucks hehe')
}

const handler (context,event) => {
    console.log("Here");
    // send_stats_to_beta_pi();
}

