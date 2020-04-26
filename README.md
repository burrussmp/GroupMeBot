A GroupMe bot to mess with my friends heads

If you want to use it.

1. ```git clone https://github.com/burrussmp/GroupMeBot.git```

2. Create a .env file and add ACCESS_TOKEN=YOURTOKEN and for the group id you want to change set that

Note: For the access token, follow the instruction [here](https://dev.groupme.com/tutorials/oauth). For the group id, after you have followed the other steps
and have correctly configured your .env file, then run the function ```print_out_group_id(token=ACCESS_TOKEN,group_name=YOURNAME)``` where YOURNAME is the name of the GroupMe group you want to analyze. This function will print the object to the console and the "id" field of the object is what you want to set the environment variable too. Sorry for not automating this...

3. In the first few lines of index.js, change the variables appropriately to set the ACCESSTOKEN and GROUPID to the group ID you want.

4. The functions below can be called to send a message to the group chat as you. Note: You have to uncomment the send line in order for it to work.
```
const send_stats_to_beta_pi = async () => {
    const [congrats,not_congrats] = await get_yesterday_statistics();
    //await send_message_to_chat(token=ACCESS_TOKEN,groupId=GROUPID,message='DAILY UPDATE\n'+congrats)
    //await send_message_to_chat(token=ACCESS_TOKEN,groupId=GROUPID,message=not_congrats +'Emory still sucks hehe')
}

const send_most_common_word = async () => {
    let message = await get_word_stats()
    //await send_message_to_chat(token=ACCESS_TOKEN,groupId=GROUPID,message=message)
}
const send_lifetime_stats = async () => {
    const [congrats,not_congrats,most_messages,least_messages] = await get_lifetime_stats();
    console.log(most_messages)
```