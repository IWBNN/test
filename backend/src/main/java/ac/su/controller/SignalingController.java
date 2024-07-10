SignalingController.java
        package ac.su.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.messaging.handler.annotation.Payload;
import ac.su.model.Message;

@Controller
public class SignalingController {

  @MessageMapping("/message/start")
  @SendTo("/topic/receive")
  public Message startStream(@Payload Message message) {
    return message;
  }

  @MessageMapping("/message/call")
  @SendTo("/topic/answer")
  public Message callStream(@Payload Message message) {
    return message;
  }

  @MessageMapping("/answer")
  @SendTo("/topic/answer")
  public Message answerStream(@Payload Message message) {
    return message;
  }

  @MessageMapping("/ice")
  @SendTo("/topic/ice")
  public Message iceCandidate(@Payload Message message) {
    return message;
  }
}