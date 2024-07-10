StreamController.java
        package ac.su.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class StreamController {

    @MessageMapping("/stream/start")
    @SendTo("/topic/start")
    public String startStream() {
        return "STARTED";
    }

    @MessageMapping("/stream/offer")
    @SendTo("/topic/offer")
    public String sendOffer(String offer) {
        return offer;
    }

    @MessageMapping("/stream/answer")
    @SendTo("/topic/answer")
    public String sendAnswer(String answer) {
        return answer;
    }

    @MessageMapping("/stream/ice")
    @SendTo("/topic/ice")
    public String sendIceCandidate(String candidate) {
        return candidate;
    }
}