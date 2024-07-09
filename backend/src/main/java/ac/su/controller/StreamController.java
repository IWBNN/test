package ac.su.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.messaging.handler.annotation.Payload;

@Controller
public class StreamController {

  @MessageMapping("/stream/start")
  @SendTo("/topic/stream/receive")
  public String startStream(@Payload String sdp) {
    return sdp;
  }

  @MessageMapping("/stream/call")
  @SendTo("/topic/stream/answer")
  public String callStream(@Payload String sdp) {
    return sdp;
  }
}
