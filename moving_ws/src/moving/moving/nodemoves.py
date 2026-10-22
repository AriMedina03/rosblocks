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


  def front(self):
    msg = PoseStamped()
    msg.pose.position.x = 2.0
    self.pose_pub.publish(msg)
    self.get_logger().info(str("Front"))


  def turnLeft(self):
    msg = PoseStamped()
    msg.pose.orientation.x = 0.0
    msg.pose.orientation.y = 0.0
    msg.pose.orientation.z = 0.7071068
    msg.pose.orientation.w = 0.7071068
    self.pose_pub.publish(msg)
    self.get_logger().info(str("RIGHT"))


  def turnRight(self):
    msg = PoseStamped()
    msg.pose.orientation.x = 0.0
    msg.pose.orientation.y = 0.0
    msg.pose.orientation.z = -0.7071068
    msg.pose.orientation.w = 0.7071068
    self.pose_pub.publish(msg)
    self.get_logger().info(str("LEFT"))


  def back(self):
    msg = PoseStamped()
    msg.pose.position.x = -2.0
    self.pose_pub.publish(msg)


  def timer_cb(self):
    if self.step == 0:
      self.front()
    elif self.step == 1:
      self.turnRight()
    elif self.step == 2:
      self.turnLeft()
    else:
      self.front()
    self.step = ((self.step + 1) % 4)



def main(args=None):
  rclpy.init(args=args)
  node = Square()
  rclpy.spin(node)
  rclpy.shutdown()

if __name__ == '__main__':
  main()
