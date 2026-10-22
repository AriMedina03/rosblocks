from setuptools import find_packages, setup

package_name = 'reto_cuadrado'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='arim',
    maintainer_email='arimedina.090@gmail.com',
    description='TODO: Package description',
    license='TODO: License declaration',
    extras_require={
        'test': [
            'pytest',
        ],
    },
    entry_points={
        'console_scripts': ["hs_cuad = reto_cuadrado.hs_cuad:main",
      "turtle_cuad = reto_cuadrado.turtle_cuad:main",
  ],
    },
)
