from setuptools import setup, find_packages

setup(
    name="erpnext_chatgpt",
    version="0.0.1",
    description="ERPNext app for OpenAI integration",
    author="William Luke",
    author_email="williamluke4@gmail.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=["frappe"],
)
