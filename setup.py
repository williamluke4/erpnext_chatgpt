from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in libbco_required/__init__.py
from libbco_required import __version__ as version

setup(
	name="erpnext_chatgpt",
	version=version,
	description="ERPNext ChatGPT",
	author="Mark H",
	author_email="no-reply@google.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
