#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseArray
from geometry_msgs.msg import Point
from geometry_msgs.msg import PoseStamped
from geometry_msgs.msg import Pose

class Square(Node):
  def __init__(self):
    super().__init__('square')

    self.step = 0
    self.timer = self.create_timer(1.0, self.timer_cb)
    self.pose_pub = self.create_publisher(PoseStamped, "/goal_pose", 10)



def main(args=None):
  rclpy.init(args=args)
  node = Square()
  rclpy.spin(node)
  rclpy.shutdown()

if __name__ == '__main__':
  main()


def front(self):
  msg = PoseStamped()
  msg. = 2.0
  self.pose_pub.publish(msg)
  self.get_logger().info(str("Front"))



def turnLeft(self):
  msg = PoseStamped()
  msg. = 0.0
  msg. = 0.0
  msg. = 0.7071068
  msg. = 0.7071068
  self.pose_pub.publish(msg)
  self.get_logger().info(str("RIGHT"))



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



def back(self):
  msg = PoseStamped()
  msg. = -2.0
  self.pose_pub.publish(msg)



def turnRight(self):
  msg = PoseStamped()
  msg. = 0.0
  msg. = 0.0
  msg. = -0.7071068
  msg. = 0.7071068
  self.pose_pub.publish(msg)
  self.get_logger().info(str("LEFT"))


self.turnLeft()

self.front()

self.turnRight()

self.front()
