$(document).ready(function () {
    // check status server
    let statusServer = true;
    (() => {
        $.ajax ({
            type: "HEAD",
            url: "http://192.168.1.142:5005/webhooks/rest",
            async: true,
            timeout: 1000,
            error: () => {
                statusServer = false
                alert("Disconected server")
            }
        })
    })();
    let statusPopup = false;
    $("#action_menu_btn").click(function () {
        $(".action_menu").toggle();
    });
    $(".chat_on").click(function () {
        if (statusPopup === false) {
            statusPopup = true;
            $(".pop_up_chat").hide(500);
        }
        else {
            statusPopup = false;
            $(".pop_up_chat").show(500);
        }
    });
    const scrollToBottom = () => {
        $('.layout_message').animate({
            scrollTop: $('.layout_message').get(0).scrollHeight}, 0);
    };
    const renderUserMessage = (text) => {
        template = `
        <div class="d-flex justify-content-end mb-4">
            <div class="msg_user">
                <span class="msg_rep">${text}</span>
                <span class="msg_time_send">8:55 AM, Today</span>
            </div>
            <div class="img_cont_msg">
                <img src="static/chatbot/img/user.png" class="rounded-circle user_img_msg">
            </div>
        </div>
        `
        $(".layout_message").append(template);
    };
    const renderBotMessage = (text) => {
        template = `
        <div class="d-flex justify-content-start mb-4">
            <div class="img_cont_msg">
                <img src="static/chatbot/img/logo.png" class="rounded-circle user_img_msg">
            </div>
            <div class="msg_bot">
                <span class="msg_send">${text}</span>
                <span class="msg_time_rep">8:40 AM, Today</span>
            </div>
        </div>
        `
        $(".layout_message").append(template);
    };
    function playAudio(audio){
        return new Promise(res=>{
          audio.play()
          audio.onended = res
        })
    };

    const playaudio = async (text, language="vi") => {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${text}`;
        const audioEl = document.querySelector("#tts-audio");
        audioEl.src = url;
        await playAudio(audioEl);
    };

    // Restful API
    const sleep = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms))
    };
    async function handleMessage(response, callback) {
        for (let i = 0; i < response.length; i++) {
            text = response[i].text;
            console.log("text >> ", text);
            // await sleep(1500);
            await callback(text);   
            scrollToBottom();
        }
    } 
    // const sendMessage = () => {
    //     scrollToBottom()
    //     let msg_user = $("#message").val()
    //     renderUserMessage(msg_user)
    //     $.ajax ({
    //         type: "POST",
    //         url: "http://192.168.1.142:5005/webhooks/rest/webhook",
    //         data: JSON.stringify({
    //             name: "rasa",
    //             message: msg_user,
    //         }),
    //         async: true,
    //         dataType: "json",
    //         contentType: "application/json",
    //         error: (e) => {
    //             console.log(e)
    //         },
    //         success: (response) => {
    //             handleMessage(response, renderBotMessage)
    //         }
    //     })
    //     // reset textarea
    //     $("#message").val("")
    // }
    // const eventHandler = () => {
    //         $(".send_btn").click(() => sendMessage())
        
    //         // enter to send message
    //         $(document).keypress((e) => {
    //             if(e.which == 13 && !e.shiftKey) {
    //                 e.preventDefault()
    //                 sendMessage()
    //             }
    //         })
    //     }

    const socket = io("http://192.168.1.142:5005");
    const checkSocket = (socket) => {
        // check connect
        socket.on("connect", function () {
            console.log("Connected to Socket.io server")
        });
        socket.on("connect_error", (error) => {
            console.error(error)
        });
    };
    const userMessage = (socket) => {
        const msg_user = $("#message").val();
        if (msg_user) {
            socket.emit("user_uttered", {
                "message": msg_user,
            });
            $("#message").val("");
        }
        renderUserMessage(msg_user);
        scrollToBottom();
    };
    const botMessage = (socket) => {
        socket.on("bot_uttered", (response) => {
            if (response.text) {
                renderBotMessage(response.text);
                scrollToBottom();
            }
        })
    };
    const eventHandler = (socket) => {
        $(".send_btn").click(() => userMessage(socket));
    
        // enter to send message
        $(document).keypress((e) => {
            if(e.which == 13 && !e.shiftKey) {
                e.preventDefault();
                userMessage(socket);
            };
        })
    };
    // chat
    if (statusServer === true) {
        checkSocket(socket);
        eventHandler(socket);
        botMessage(socket);
    };

    // call
    const SpeechToText = window.webkitSpeechRecognition;
    speechApi = new SpeechToText();
    speechApi.continuous = true;
    speechApi.interimResults = false;
    speechApi.lang = 'vi-VN';
    speechApi.onresult = (event)=> {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript;
        if (transcript && transcript != "Ừ.") {
            console.log("transcript >> ", transcript);
            $.ajax ({
                type: "POST",
                url: "http://192.168.1.142:5005/webhooks/rest/webhook",
                data: JSON.stringify({
                    "name": "rasa",
                    "message": transcript,
                }),
                async: true,
                dataType: "json",
                contentType: "application/json",
                error: (e) => {
                    console.error(e)
                },
                success: (response) => {
                    handleMessage(response, playaudio)
                }
            })
        };
        // if (transcript) {
        //     socket.emit("user_uttered", {
        //         "message": transcript,
        //     });
        //     renderUserMessage(transcript);
        //     scrollToBottom();
        // };
        // socket.on("bot_uttered", (response) => {
        //     if (response.text) {
        //         language = "vi";
        //         text = response.text;
        //         renderBotMessage(text);
        //         scrollToBottom();
        //         const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${text}`;
        //         const audioEl = document.querySelector("#tts-audio");
        //         audioEl.src = url;
        //         audioEl.play();
        //     }
        // })
    };

    let statusCall = false;
    // const speech = new SpeechRecognitionApi();
    $(".make_call").click(() => {
        if (statusCall === false) {
            statusCall = true;
            console.log("Calling");
            // speech.init();
            speechApi.start();
        }
        else {
            statusCall = false;
            console.log("Ending call");
            // speech.stop();
            speechApi.stop();
        }
    });    
})
