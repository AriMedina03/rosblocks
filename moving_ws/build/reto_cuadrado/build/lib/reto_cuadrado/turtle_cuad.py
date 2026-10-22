import subprocess

def launch_executable_helper(command: str):
  subprocess.Popen(["/bin/bash", "-c", command])


#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

class TurtleMove(Node):
  def __init__(self):
    super().__init__('Turtlesim')

    launch_executable_helper("ros2 run turtlesim turtlesim_node")
    self.pose_pub = self.create_publisher(Twist, "/turtle1/cmd_vel", 10)
    self.step = 0
    self.timer = self.create_timer(1.0, self.timer_cb)



def main(args=None):
  rclpy.init(args=args)
  node = TurtleMove()
  rclpy.spin(node)
  rclpy.shutdown()

if __name__ == '__main__':
  main()


def side1(self):
  msg = Twist()
  msg. = float(1)
  self.pose_pub.publish(msg)
  self.get_logger().info(str("SIDE 1"))



def side2(self):
  msg = Twist()
  msg. = float(1.57)
  msg. = float(1)
  self.pose_pub.publish(msg)
  self.get_logger().info(str("SIDE 2"))



def side3(self):
  msg = Twist()
  msg. = float(1)
  self.pose_pub.publish(msg)
  self.get_logger().info(str("SIDE 3"))



def side4(self):
  msg = Twist()
  msg. = float(1.57)
  msg. = float(1)
  self.pose_pub.publish(msg)
  self.get_logger().info(str("SIDE 4"))



def timer_cb(self):
  if self.step == 0:
    pass
  elif self.step == 1:
    pass
  elif self.step == 2:
    pass
  else:
    pass
  self.step = ((self.step + 1) % 4)


self.side1()

self.side2()

self.side3()

self.side4()
